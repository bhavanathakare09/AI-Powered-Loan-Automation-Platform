# loan_app/views.py

from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.decorators import action
from rest_framework.response import Response
from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Sum, Max
from .models import Customer, Loan, Payment, EscrowAccount
from .serializers import (
    CustomerSerializer,
    LoanSerializer,
    PaymentSerializer,
    EscrowSerializer,
)


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by("-created_at")
    serializer_class = CustomerSerializer


def _emi(principal: Decimal, annual_rate: Decimal, term_months: int) -> Decimal:
    principal = Decimal(principal)
    annual_rate = Decimal(annual_rate)
    n = max(1, int(term_months))
    r = (annual_rate / Decimal("100")) / Decimal("12")
    if r == 0:
        return (principal / Decimal(n)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    num = principal * r * (1 + r) ** n
    den = (1 + r) ** n - 1
    return (num / den).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)



class LoanViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
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
        - status (ACTIVE/PAID)
        """
        loan = self.get_object()

        # Aggregates from Payment table
        agg = Payment.objects.filter(loan=loan).aggregate(
            total_paid=Sum("amount"),
            last_payment_date=Max("payment_date"),
        )
        total_paid = agg["total_paid"] or Decimal("0.00")
        last_payment_date = agg["last_payment_date"]

        # Current balances
        balance = (loan.outstanding_principal or loan.principal_amount) or Decimal("0.00")
        balance = Decimal(balance).quantize(Decimal("0.01"))

        # Next payment preview using current balance & loan config
        payment_per_period = _emi(balance, loan.annual_interest_rate, loan.term_months)
        r = (Decimal(loan.annual_interest_rate) / Decimal("100")) / Decimal("12")
        interest_next = (balance * r).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        principal_next = (payment_per_period - interest_next).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if principal_next < 0:
            principal_next = Decimal("0.00")

        # Escrow (if exists)
        escrow_balance = None
        if hasattr(loan, "escrow") and loan.escrow is not None:
            escrow_balance = float(loan.escrow.balance)

        status = "PAID" if balance <= 0 else (loan.status or "ACTIVE")

        data = {
            "loan_id": loan.id,
            "customer_id": loan.customer_id,
            "principal_amount": float(loan.principal_amount),
            "annual_interest_rate_percent": float(loan.annual_interest_rate),
            "term_months": int(loan.term_months),
            "status": status,

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
            "escrow": {
                "balance": escrow_balance,
            },
        }
        return Response(data)



class EscrowViewSet(viewsets.ModelViewSet):
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
    queryset = Payment.objects.all().order_by("-created_at")
    serializer_class = PaymentSerializer

    @action(detail=True, methods=["post"])
    def perform_create(self, serializer):
        loan = serializer.validated_data["loan"]
        if loan.status == Loan.STATUS_PAID_OFF:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("This loan is already PAID_OFF. No further payments allowed.")
        serializer.save()

    def mark_processed(self, request, pk=None):
        """Process payment - split into interest and principal allocation"""
        payment = self.get_object()
        loan = payment.loan

        # Daily or monthly interest rate
        monthly_rate = loan.annual_interest_rate / Decimal("12.0") / Decimal("100.0")
        
        # Interest for this EMI period
        interest_component = loan.outstanding_principal * monthly_rate

        # Principal component = total payment - interest
        principal_component = Decimal(payment.amount) - interest_component

        if principal_component < 0:
            principal_component = Decimal("0.00")

        # Update financial logs
        loan.total_interest_paid += interest_component
        loan.outstanding_principal -= principal_component

        # Mark as processed
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
