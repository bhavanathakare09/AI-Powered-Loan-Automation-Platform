# loan_app/views.py
from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Sum, Max, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
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
def calculate_emi(principal: Decimal, annual_rate: Decimal, term_months: int) -> Decimal:
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
    permission_classes = [IsAdminOrReadOnly]
    queryset = Loan.objects.all().order_by("-created_at")
    serializer_class = LoanSerializer

    @action(detail=True, methods=["get"], url_path="summary")
    def summary(self, request, pk=None):
        """
        KPI summary for a single loan:
        - totals (paid so far, interest paid, outstanding balance)
        - last payment date, count of payments
        - next payment preview (payment, interest, principal)
        - escrow balance (if exists)
        - status (ACTIVE/PAID_OFF/DEFAULTED)
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

        payment_per_period = calculate_emi(balance, loan.annual_interest_rate, loan.term_months)
        r = (Decimal(loan.annual_interest_rate) / Decimal("100")) / Decimal("12")
        interest_next = (balance * r).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        principal_next = (payment_per_period - interest_next).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if principal_next < 0:
            principal_next = Decimal("0.00")

        escrow_balance = None
        if hasattr(loan, "escrow") and loan.escrow is not None:
            escrow_balance = float(loan.escrow.balance)

        status_val = "PAID_OFF" if balance <= 0 else (loan.status or "ACTIVE")

        data = {
            "loan_id": loan.id,
            "customer_id": loan.customer_id,
            "principal_amount": float(loan.principal_amount),
            "annual_interest_rate_percent": float(loan.annual_interest_rate),
            "term_months": int(loan.term_months),
            "status": status_val,
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

    # ⚠️ DRF hook (not an @action). This is called on POST /payments/.
    def perform_create(self, serializer):
        loan = serializer.validated_data["loan"]
        if getattr(Loan, "STATUS_PAID_OFF", None) and loan.status == Loan.STATUS_PAID_OFF:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("This loan is already PAID_OFF. No further payments allowed.")
        serializer.save()

    @action(detail=True, methods=["post"])
    def mark_processed(self, request, pk=None):
        """Process payment - split into interest and principal allocation"""
        payment = self.get_object()
        loan = payment.loan

        monthly_rate = loan.annual_interest_rate / Decimal("12.0") / Decimal("100.0")
        interest_component = (loan.outstanding_principal * monthly_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        principal_component = Decimal(payment.amount) - interest_component
        if principal_component < 0:
            principal_component = Decimal("0.00")

        loan.total_interest_paid = (loan.total_interest_paid or Decimal("0.00")) + interest_component
        loan.outstanding_principal = (loan.outstanding_principal or Decimal("0.00")) - principal_component

        # Auto flip to PAID_OFF if cleared
        if loan.outstanding_principal <= 0:
            loan.outstanding_principal = Decimal("0.00")
            if hasattr(Loan, "STATUS_PAID_OFF"):
                loan.status = Loan.STATUS_PAID_OFF
            else:
                loan.status = "PAID_OFF"

        payment.note = f"Processed | Principal: {principal_component:.2f}, Interest: {interest_component:.2f}"
        payment.save()
        loan.save()

        return Response({
            "message": "Payment processed successfully",
            "principal_applied": float(principal_component),
            "interest_applied": float(interest_component),
            "new_outstanding_balance": float(loan.outstanding_principal),
            "total_interest_paid": float(loan.total_interest_paid)
        })


# ----------------------------
# Auth helper
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


# ----------------------------
# AI Query (Day 3/4 feature)
# ----------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_query(request):
    """
    Simple NL → analytics over your DB.
    """
    from .models import Customer, Loan, Payment

    text = (request.data.get("question") or "").strip().lower()
    if not text:
        return Response({"answer": "Please ask a question, e.g. 'total customers'."})

    # Safe Aggregations
    total_customers = Customer.objects.count()
    active_loans = Loan.objects.filter(status="ACTIVE").count()
    paid_loans = Loan.objects.filter(status="PAID_OFF").count()
    default_loans = Loan.objects.filter(status="DEFAULTED").count()

    outstanding = Loan.objects.aggregate(
        s=Sum("outstanding_principal")
    )["s"] or Decimal("0.00")

    # ✅ Use EMI field if exists, else 0
    monthly_emi_total = 0
    try:
        monthly_emi_total = Loan.objects.aggregate(
            s=Sum("scheduled_monthly_payment")
        )["s"] or Decimal("0.00")
    except:
        monthly_emi_total = 0

    # Recent payments
    recent = list(
        Payment.objects.order_by("-payment_date", "-id").values(
            "id", "loan_id", "amount", "payment_date", "note"
        )[:5]
    )

    # Simple intent
    if "total customers" in text:
        ans = f"Total customers: {total_customers}."
    elif "active loans" in text:
        ans = f"Active loans: {active_loans}."
    elif "paid loans" in text or "paid off" in text:
        ans = f"Paid-off loans: {paid_loans}."
    elif "outstanding" in text:
        ans = f"Total outstanding principal: ${outstanding}."
    elif "emi" in text:
        ans = f"Monthly EMI total (approx): ${monthly_emi_total}."
    else:
        ans = (
            "I can answer: 'total customers', 'active loans', "
            "'outstanding principal', 'monthly emi total', 'recent payments'."
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
            "recent_payments": recent,
        }
    })


# ----------------------------
# Function-based endpoints to match your backend/urls.py
# ----------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def amortization_preview(request, loan_id: int):
    """
    GET /api/loans/<loan_id>/amortization_preview/?n=6
    Returns next N payment rows using current outstanding balance.
    """
    loan = get_object_or_404(Loan, pk=loan_id)
    try:
        n = int(request.query_params.get("n", 6))
    except Exception:
        n = 6
    n = max(1, min(360, n))

    schedule = []
    balance = (loan.outstanding_principal or loan.principal_amount) or Decimal("0.00")
    balance = Decimal(balance).quantize(Decimal("0.01"))

    if balance <= 0:
        return Response({"loan_id": loan.id, "rows": [], "remaining_balance": 0.0})

    payment = calculate_emi(balance, loan.annual_interest_rate, loan.term_months)
    r = (Decimal(loan.annual_interest_rate) / Decimal("100")) / Decimal("12")

    for i in range(1, n + 1):
        interest = (balance * r).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        principal = (payment - interest).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if principal > balance:
            principal = balance
            payment_row = principal + interest
        else:
            payment_row = payment

        new_balance = (balance - principal).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        schedule.append({
            "period": i,
            "payment": float(payment_row),
            "interest": float(interest),
            "principal": float(principal),
            "balance_after": float(new_balance),
        })

        balance = new_balance
        if balance <= 0:
            break

    return Response({
        "loan_id": loan.id,
        "rows": schedule,
        "remaining_balance": float(balance),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def loan_summary(request, loan_id: int):
    """
    GET /api/loans/<loan_id>/summary/
    Function-based twin of LoanViewSet.summary (to match backend/urls.py).
    """
    loan = get_object_or_404(Loan, pk=loan_id)

    agg = Payment.objects.filter(loan=loan).aggregate(
        total_paid=Sum("amount"),
        last_payment_date=Max("payment_date"),
    )
    total_paid = agg["total_paid"] or Decimal("0.00")
    last_payment_date = agg["last_payment_date"]

    balance = (loan.outstanding_principal or loan.principal_amount) or Decimal("0.00")
    balance = Decimal(balance).quantize(Decimal("0.01"))

    payment_per_period = calculate_emi(balance, loan.annual_interest_rate, loan.term_months)
    r = (Decimal(loan.annual_interest_rate) / Decimal("100")) / Decimal("12")
    interest_next = (balance * r).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    principal_next = (payment_per_period - interest_next).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if principal_next < 0:
        principal_next = Decimal("0.00")

    escrow_balance = None
    if hasattr(loan, "escrow") and loan.escrow is not None:
        escrow_balance = float(loan.escrow.balance)

    status_val = "PAID_OFF" if balance <= 0 else (loan.status or "ACTIVE")

    return Response({
        "loan_id": loan.id,
        "customer_id": loan.customer_id,
        "principal_amount": float(loan.principal_amount),
        "annual_interest_rate_percent": float(loan.annual_interest_rate),
        "term_months": int(loan.term_months),
        "status": status_val,
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
    })