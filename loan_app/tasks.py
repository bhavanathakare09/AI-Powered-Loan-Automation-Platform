# loan_app/tasks.py
from celery import shared_task
from decimal import Decimal, ROUND_HALF_UP
from datetime import date
from django.db import transaction
from loan_app.models import Loan, Payment

def _emi(principal: Decimal, annual_rate: Decimal, term_months: int) -> Decimal:
    """Standard annuity EMI calculation on remaining principal."""
    principal = Decimal(principal)
    annual_rate = Decimal(annual_rate)
    term_months = int(term_months) if term_months and int(term_months) > 0 else 1

    r = (annual_rate / Decimal("100")) / Decimal("12")
    if r == 0:
        return (principal / Decimal(term_months)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    num = principal * r * (1 + r) ** term_months
    den = (1 + r) ** term_months - 1
    emi = num / den
    return emi.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

@shared_task
def process_daily_emi():
    """Demo mode: create & apply one EMI for every ACTIVE loan each run."""
    today = date.today()
    created = 0

    for loan in Loan.objects.all():
        # skip fully paid loans
        if not loan.outstanding_principal or loan.outstanding_principal <= 0:
            continue

        # Compute EMI using CURRENT remaining principal
        emi_amount = _emi(
            principal=loan.outstanding_principal,
            annual_rate=loan.annual_interest_rate,
            term_months=max(1, loan.term_months),  # simple assumption for demo
        )

        # Interest for this period (monthly)
        monthly_rate = (loan.annual_interest_rate / Decimal("100")) / Decimal("12")
        interest_component = (loan.outstanding_principal * monthly_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # Principal = EMI - interest
        principal_component = (emi_amount - interest_component).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if principal_component < 0:
            principal_component = Decimal("0.00")

        with transaction.atomic():
            Payment.objects.create(
                amount=emi_amount,
                payment_date=today,
                loan=loan,
                note=f"Auto EMI via Celery | principal={principal_component} interest={interest_component}",
            )

            loan.total_interest_paid += interest_component
            loan.outstanding_principal -= principal_component
            if loan.outstanding_principal < 0:
                loan.outstanding_principal = Decimal("0.00")
            loan.save()

            created += 1

    return f"Processed {created} EMI payments on {today.isoformat()}"
