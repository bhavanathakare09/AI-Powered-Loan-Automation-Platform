from django.db import models
from django.utils import timezone
from decimal import Decimal


class Customer(models.Model):
    full_name = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.full_name} ({self.email})"


class Loan(models.Model):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("PAID_OFF", "Paid Off"),
        ("DEFAULTED", "Defaulted"),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="loans")
    principal_amount = models.DecimalField(max_digits=12, decimal_places=2)  # e.g. 250000.00
    annual_interest_rate = models.DecimalField(max_digits=5, decimal_places=2)  # e.g. 6.50 = 6.5%
    term_months = models.PositiveIntegerField()  # e.g. 360
    start_date = models.DateField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ACTIVE")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Loan #{self.id} for {self.customer.full_name}"

    @property
    def monthly_interest_rate(self) -> Decimal:
        # 6.50% -> 0.065/12
        return (self.annual_interest_rate / Decimal("100")) / Decimal("12")

    @property
    def scheduled_monthly_payment(self) -> Decimal:
        """
        Classic amortization formula (P * r * (1+r)^n) / ((1+r)^n - 1).
        If r==0, just principal/term.
        """
        P = self.principal_amount
        n = Decimal(self.term_months)
        r = self.monthly_interest_rate
        if r == 0:
            return (P / n).quantize(Decimal("0.01"))
        top = P * r * (1 + r) ** n
        bottom = (1 + r) ** n - 1
        return (top / bottom).quantize(Decimal("0.01"))


class EscrowAccount(models.Model):
    loan = models.OneToOneField(Loan, on_delete=models.CASCADE, related_name="escrow")
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Escrow for Loan #{self.loan_id}"


class Payment(models.Model):
    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField(default=timezone.now)
    note = models.CharField(max_length=200, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Payment {self.amount} for Loan #{self.loan_id} on {self.payment_date}"

