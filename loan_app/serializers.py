from rest_framework import serializers
from .models import Customer, Loan, Payment, EscrowAccount
from decimal import Decimal


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"


class LoanSerializer(serializers.ModelSerializer):
    scheduled_monthly_payment = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = Loan
        fields = [
            "id",
            "customer",
            "principal_amount",
            "annual_interest_rate",
            "term_months",
            "start_date",
            "status",
            "outstanding_principal",
            "total_interest_paid",
            "scheduled_monthly_payment",  
        ]
        read_only_fields = ["created_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["scheduled_monthly_payment"] = str(instance.scheduled_monthly_payment)
        return data


class EscrowSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscrowAccount
        fields = "__all__"
        read_only_fields = ["created_at"]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = "__all__"
        read_only_fields = ["created_at"]

    def validate_amount(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("Payment amount must be positive.")
        return value
