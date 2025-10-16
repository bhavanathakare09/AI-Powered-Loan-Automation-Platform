from django.db import models
from django.utils import timezone
from decimal import Decimal
from datetime import date



class Customer(models.Model):
    full_name = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.full_name} ({self.email})"


# loan_app/models.py
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from django.db import models
from django.utils import timezone


class Loan(models.Model):
    # ---- Status constants/choices ----
    STATUS_ACTIVE = "ACTIVE"
    STATUS_PAID_OFF = "PAID_OFF"
    STATUS_DEFAULTED = "DEFAULTED"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_PAID_OFF, "Paid Off"),
        (STATUS_DEFAULTED, "Defaulted"),
    ]

    # ---- Core fields ----
    customer = models.ForeignKey("loan_app.Customer", on_delete=models.CASCADE, related_name="loans")
    principal_amount = models.DecimalField(max_digits=12, decimal_places=2)           # e.g. 250000.00
    annual_interest_rate = models.DecimalField(max_digits=5, decimal_places=2)        # e.g. 6.50 = 6.5%
    term_months = models.PositiveIntegerField()                                       # e.g. 360
    start_date = models.DateField(default=timezone.now)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    paid_off_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    outstanding_principal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total_interest_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    # ---------- Helpers ----------
    def __str__(self) -> str:
        return f"Loan #{self.id} for {self.customer.full_name}"

    @property
    def monthly_interest_rate(self) -> Decimal:
        """Annual % -> monthly decimal rate, e.g. 6.50 -> 0.065/12"""
        return (Decimal(self.annual_interest_rate) / Decimal("100")) / Decimal("12")

    @property
    def scheduled_monthly_payment(self) -> Decimal:
        """
        Classic amortization formula (P * r * (1+r)^n) / ((1+r)^n - 1).
        If r == 0 → principal/term.
        """
        P = Decimal(self.principal_amount)
        n = Decimal(self.term_months if self.term_months else 1)
        r = self.monthly_interest_rate
        if r == 0:
            return (P / n).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        top = P * r * (1 + r) ** n
        bottom = (1 + r) ** n - 1
        return (top / bottom).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def apply_allocation(self, principal_component: Decimal, interest_component: Decimal):
        """
        Small utility to apply a processed payment's split to this loan safely.
        Call this from your view/Celery after you've computed principal/interest for a payment.
        """
        principal_component = Decimal(principal_component or 0).quantize(Decimal("0.01"))
        interest_component = Decimal(interest_component or 0).quantize(Decimal("0.01"))

        self.total_interest_paid = (self.total_interest_paid or Decimal("0.00")) + interest_component
        self.outstanding_principal = (self.outstanding_principal or Decimal("0.00")) - principal_component
        self.save(update_fields=["total_interest_paid", "outstanding_principal", "status", "paid_off_date"])

    # ---------- Status/guard logic ----------
    def save(self, *args, **kwargs):
        # Initialize outstanding on first save
        if self.pk is None and (self.outstanding_principal is None or self.outstanding_principal == 0):
            self.outstanding_principal = self.principal_amount

        # Normalize & clamp negative balances
        if self.outstanding_principal is None:
            self.outstanding_principal = Decimal("0.00")
        if self.outstanding_principal < 0:
            self.outstanding_principal = Decimal("0.00")

        # Flip to PAID_OFF when balance hits zero; otherwise Active (unless Defaulted)
        if self.outstanding_principal == 0:
            if self.status != self.STATUS_PAID_OFF:
                self.status = self.STATUS_PAID_OFF
                if not self.paid_off_date:
                    self.paid_off_date = date.today()
        else:
            if self.status == self.STATUS_PAID_OFF:
                # If balance was increased later (unlikely), revert to active
                self.status = self.STATUS_ACTIVE
                self.paid_off_date = None

        super().save(*args, **kwargs)


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

