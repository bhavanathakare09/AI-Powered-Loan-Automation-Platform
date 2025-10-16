# loan_app/management/commands/seed_demo.py
from django.core.management.base import BaseCommand
from loan_app.models import Customer, Loan, EscrowAccount
from decimal import Decimal

class Command(BaseCommand):
    help = "Seed demo data"

    def handle(self, *args, **kwargs):
        c, _ = Customer.objects.get_or_create(full_name="Demo User", email="demo@example.com", phone="555-0100")
        loan, _ = Loan.objects.get_or_create(
            customer=c,
            principal_amount=Decimal("250000.00"),
            annual_interest_rate=Decimal("6.50"),
            term_months=360,
            status="ACTIVE",
        )
        EscrowAccount.objects.get_or_create(loan=loan)
        self.stdout.write(self.style.SUCCESS(f"Seeded demo: customer={c.id}, loan={loan.id}"))
