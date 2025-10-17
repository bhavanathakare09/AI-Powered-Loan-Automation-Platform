# loan_app/views.py

from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Sum, Max, Q
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.response import Response

from .models import Customer, Loan, Payment, EscrowAccount
from .permissions import IsAdminOrReadOnly
from .serializers import (
    CustomerSerializer,
    LoanSerializer,
    PaymentSerializer,
    EscrowSerializer,
)

# ----------------------------
# Helpers
# ----------------------------

def _emi(principal: Decimal, annual_rate: Decimal, term_months: int) -> Decimal:
    """
    Standard amortization monthly payment.
    """
    principal = Decimal(principal)
    annual_rate = Decimal(annual_rate)
    n = max(1, int(term_months))
    r = (annual_rate / Decimal("100")) / Decimal("12")
    if r == 0:
        return (principal / Decimal(n)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    num = principal * r * (1 + r) ** n
    den = (1 + r) ** n - 1
    return (num / den).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# ----------------------------
# ViewSets
# ----------------------------

class CustomerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = Customer.objects.all().order_by("-created_at")
    serializer_class = CustomerSerializer


class LoanViewSet(viewsets.ModelViewSet):
    # Only staff can write; everyone else can read (if you open up list/retrieve later)
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = Loan.objects.all().order_by("-created_at")
    serializer_class = LoanSerializer

    @action(detail=True, methods=["get"], url_path="summary")
    def summary(self, request, pk=None):
        """
        KPI summary for a single loan.
        """
        loan = self.get_object()

        agg = Payment.objects.filter(loan=loan).aggregate(
            total_paid=Sum("amount"),
            last_payment_date=Max("payment_date"),
        )
        total_paid = agg["total_paid"] or Decimal("0.00")
        last_payment_date = agg["last_payment_date"]

        balance = (loan.outstanding_principal or loan.principal_amount) or Decimal("0.00")
        balance = Decimal(balance).quantize(Decimal("0.01"))

        payment_per_period = _emi(balance, loan.annual_interest_rate, loan.term_months)
        r = (Decimal(loan.annual_interest_rate) / Decimal("100")) / Decimal("12")
        interest_next = (balance * r).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        principal_next = (payment_per_period - interest_next).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if principal_next < 0:
            principal_next = Decimal("0.00")

        escrow_balance = None
        if hasattr(loan, "escrow") and loan.escrow is not None:
            escrow_balance = float(loan.escrow.balance)

        status_text = "PAID_OFF" if balance <= 0 else (loan.status or "ACTIVE")

        data = {
            "loan_id": loan.id,
            "customer_id": loan.customer_id,
            "principal_amount": float(loan.principal_amount),
            "annual_interest_rate_percent": float(loan.annual_interest_rate),
            "term_months": int(loan.term_months),
            "status": status_text,
            "totals": {
                "paid_so_far": float(total_paid),
                "interest_paid": float(loan.total_interest_paid or 0),
                "outstanding_principal": float(balance),
            },
            "payments": {
                "count": Payment.objects.filter(loan=loan).count(),
                "last_payment_date": last_payment_date,
            },
            "next_payment_preview": {
                "payment": float(payment_per_period),
                "interest": float(interest_next),
                "principal": float(principal_next),
                "projected_balance_after": float((balance - principal_next) if balance > 0 else 0),
            },
            "escrow": {"balance": escrow_balance},
        }
        return Response(data)

    @action(detail=True, methods=["get"], url_path="amortization_preview")
    def amortization_preview_action(self, request, pk=None):
        """
        Same as the function endpoint, but exposed under the viewset:
        /api/loans/{id}/amortization_preview/?n=10&amp;mode=daily
        """
        return amortization_preview(request, pk)


class EscrowViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = EscrowAccount.objects.all().order_by("-created_at")
    serializer_class = EscrowSerializer

    @action(detail=True, methods=["post"])
    def deposit(self, request, pk=None):
        """Deposit money into the escrow account."""
        escrow = self.get_object()
        try:
            amount = Decimal(str(request.data.get("amount", "0")))
        except Exception:
            return Response({"detail": "Invalid amount"}, status=400)

        if amount <= 0:
            return Response({"detail": "Amount must be > 0"}, status=400)

        escrow.balance += amount
        escrow.save()
        return Response(EscrowSerializer(escrow).data, status=status.HTTP_200_OK)


class PaymentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = Payment.objects.all().order_by("-created_at")
    serializer_class = PaymentSerializer

    # NOTE: do NOT decorate perform_create with @action
    def perform_create(self, serializer):
        loan = serializer.validated_data["loan"]
        if (loan.status or "").upper() == "PAID_OFF":
            from rest_framework.exceptions import ValidationError
            raise ValidationError("This loan is already PAID_OFF. No further payments allowed.")
        serializer.save()

    @action(detail=True, methods=["post"])
    def mark_processed(self, request, pk=None):
        """Process payment - split into interest and principal allocation"""
        payment = self.get_object()
        loan = payment.loan

        monthly_rate = loan.annual_interest_rate / Decimal("12.0") / Decimal("100.0")
        interest_component = loan.outstanding_principal * monthly_rate
        principal_component = Decimal(payment.amount) - interest_component

        if principal_component < 0:
            principal_component = Decimal("0.00")

        loan.total_interest_paid += interest_component
        loan.outstanding_principal -= principal_component

        payment.note = f"Processed | Principal: {principal_component:.2f}, Interest: {interest_component:.2f}"
        payment.save()
        loan.save()

        return Response({
            "message": "Payment processed successfully",
            "principal_applied": float(principal_component),
            "interest_applied": float(interest_component),
            "new_outstanding_balance": float(loan.outstanding_principal),
            "total_interest_paid": float(loan.total_interest_paid),
        })


# ----------------------------
# Standalone endpoints
# ----------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    u = request.user
    return Response({
        "id": u.id,
        "username": u.username,
        "email": u.email or "",
        "is_staff": u.is_staff,
        "is_superuser": u.is_superuser,
        "first_name": u.first_name or "",
        "last_name": u.last_name or "",
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def loan_summary(request, pk: int):
    """
    Function-form of the summary for compatibility with urls.py that imports it.
    Mirrors LoanViewSet.summary.
    """
    try:
        loan = Loan.objects.get(pk=pk)
    except Loan.DoesNotExist:
        return Response({"detail": "Loan not found"}, status=404)

    agg = Payment.objects.filter(loan=loan).aggregate(
        total_paid=Sum("amount"),
        last_payment_date=Max("payment_date"),
    )
    total_paid = agg["total_paid"] or Decimal("0.00")
    last_payment_date = agg["last_payment_date"]

    balance = (loan.outstanding_principal or loan.principal_amount) or Decimal("0.00")
    balance = Decimal(balance).quantize(Decimal("0.01"))

    payment_per_period = _emi(balance, loan.annual_interest_rate, loan.term_months)
    r = (Decimal(loan.annual_interest_rate) / Decimal("100")) / Decimal("12")
    interest_next = (balance * r).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    principal_next = (payment_per_period - interest_next).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if principal_next < 0:
        principal_next = Decimal("0.00")

    escrow_balance = None
    if hasattr(loan, "escrow") and loan.escrow is not None:
        escrow_balance = float(loan.escrow.balance)

    status_text = "PAID_OFF" if balance <= 0 else (loan.status or "ACTIVE")

    data = {
        "loan_id": loan.id,
        "customer_id": loan.customer_id,
        "principal_amount": float(loan.principal_amount),
        "annual_interest_rate_percent": float(loan.annual_interest_rate),
        "term_months": int(loan.term_months),
        "status": status_text,
        "totals": {
            "paid_so_far": float(total_paid),
            "interest_paid": float(loan.total_interest_paid or 0),
            "outstanding_principal": float(balance),
        },
        "payments": {
            "count": Payment.objects.filter(loan=loan).count(),
            "last_payment_date": last_payment_date,
        },
        "next_payment_preview": {
            "payment": float(payment_per_period),
            "interest": float(interest_next),
            "principal": float(principal_next),
            "projected_balance_after": float((balance - principal_next) if balance > 0 else 0),
        },
        "escrow": {"balance": escrow_balance},
    }
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def amortization_preview(request, pk: int):
    """
    Daily demo amortization preview.
    Query params:
      - n: number of rows (days) to preview (default 10)
    Logic:
      - monthly EMI = standard formula on current balance
      - assume daily payment = monthly / 30 (demo mode)
      - daily interest = balance * (annual_rate/100/365)
    """
    try:
        loan = Loan.objects.get(pk=pk)
    except Loan.DoesNotExist:
        return Response({"detail": "Loan not found"}, status=404)

    try:
        n = int(request.query_params.get("n", 10))
    except Exception:
        n = 10
    n = max(1, min(90, n))  # keep sensible bounds

    balance = Decimal(loan.outstanding_principal or loan.principal_amount or 0).quantize(Decimal("0.01"))
    monthly_payment = _emi(balance, loan.annual_interest_rate, loan.term_months)
    # demo: evenly spread across 30 days
    daily_payment = (monthly_payment / Decimal("30")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    daily_rate = (Decimal(loan.annual_interest_rate) / Decimal("100")) / Decimal("365")

    rows = []
    for day in range(1, n + 1):
        if balance <= 0:
            rows.append({
                "day": day,
                "payment": 0.0,
                "interest": 0.0,
                "principal": 0.0,
                "balance_after": 0.0,
            })
            break

        interest = (balance * daily_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        principal = (daily_payment - interest).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if principal < 0:
            principal = Decimal("0.00")
        if principal > balance:
            principal = balance

        payment = (principal + interest).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        balance = (balance - principal).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        rows.append({
            "day": day,
            "payment": float(payment),
            "interest": float(interest),
            "principal": float(principal),
            "balance_after": float(balance),
        })

    return Response({
        "loan_id": loan.id,
        "mode": "daily_preview",
        "scheduled_monthly_payment": float(monthly_payment),
        "assumed_daily_payment": float(daily_payment),
        "rows": rows,
    })


# ----------------------------
# Simple "AI" analytics endpoint
# ----------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_query(request):
    """
    Simple NL → analytics over your DB (keyword-based intent).
    """
    text = (request.data.get("question") or "").strip().lower()
    if not text:
        return Response({"answer": "Please ask a question, e.g. 'total customers'."})

    total_customers = Customer.objects.count()
    active_loans = Loan.objects.filter(status="ACTIVE").count()
    paid_loans = Loan.objects.filter(status="PAID_OFF").count()
    default_loans = Loan.objects.filter(status="DEFAULTED").count()

    outstanding = Loan.objects.aggregate(s=Sum("outstanding_principal"))["s"] or Decimal("0.00")
    monthly_emi_total = Loan.objects.aggregate(s=Sum("scheduled_monthly_payment"))["s"] or Decimal("0.00")

    cutoff = timezone.now().date() - timezone.timedelta(days=35)
    overdue_ids = (
        Loan.objects
            .filter(status="ACTIVE")
            .annotate(last_paid=Max("payment__payment_date"))
            .filter(Q(last_paid__lt=cutoff) | Q(last_paid__isnull=True))
            .values_list("id", flat=True)
    )
    overdue_count = len(overdue_ids)

    recent = list(
        Payment.objects.order_by("-payment_date", "-id").values(
            "id", "loan_id", "amount", "payment_date", "note"
        )[:5]
    )

    def money(n):
        return f"₹ {Decimal(n or 0):,.2f}"

    if "total customers" in text or "how many customers" in text:
        ans = f"Total customers: {total_customers}."
    elif "active loans" in text:
        ans = f"Active loans: {active_loans}."
    elif "paid off" in text or "paid loans" in text:
        ans = f"Paid off loans: {paid_loans}."
    elif "default" in text:
        ans = f"Defaulted loans: {default_loans}."
    elif "outstanding" in text:
        ans = f"Total outstanding principal: {money(outstanding)}."
    elif "monthly emi" in text or "emi total" in text or "scheduled" in text:
        ans = f"Scheduled monthly EMI across loans: {money(monthly_emi_total)}."
    elif "overdue" in text or "late" in text or "missed" in text:
        ans = f"Overdue (heuristic): {overdue_count} loans → {list(overdue_ids)[:10]}"
    elif "recent payment" in text or "last payment" in text:
        ans = "Recent payments:\n" + "\n".join(
            [f"- #{p['id']} loan #{p['loan_id']} {money(p['amount'])} on {p['payment_date']} ({p.get('note') or '-'})"
             for p in recent]
        )
    else:
        ans = (
            "I can answer things like: 'total customers', 'active loans', 'outstanding principal', "
            "'monthly EMI total', 'overdue loans', 'recent payments'."
        )

    return Response({
        "answer": ans,
        "facts": {
            "customers": total_customers,
            "active_loans": active_loans,
            "paid_off_loans": paid_loans,
            "defaulted_loans": default_loans,
            "outstanding_principal": str(outstanding),
            "monthly_emi_total": str(monthly_emi_total),
            "overdue_loans_count": overdue_count,
            "recent_payments": recent,
        }
    })