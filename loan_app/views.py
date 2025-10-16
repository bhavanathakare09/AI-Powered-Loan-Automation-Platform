# loan_app/views.py
from decimal import Decimal

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

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


class LoanViewSet(viewsets.ModelViewSet):
    queryset = Loan.objects.all().order_by("-created_at")
    serializer_class = LoanSerializer

    @action(detail=True, methods=["get"])
    def escrow(self, request, pk=None):
        loan = self.get_object()
        escrow = getattr(loan, "escrow", None)
        if not escrow:
            return Response({"detail": "No escrow for this loan"}, status=404)
        return Response(EscrowSerializer(escrow).data)


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
    def mark_processed(self, request, pk=None):
        """Temporary action; tomorrow we'll replace with Celery processing."""
        payment = self.get_object()
        payment.note = (payment.note or "") + " | processed"
        payment.save()
        return Response(PaymentSerializer(payment).data)
