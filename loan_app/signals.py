from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Loan, EscrowAccount

@receiver(post_save, sender=Loan)
def create_escrow_for_new_loan(sender, instance: Loan, created, **kwargs):
    if created:
        EscrowAccount.objects.get_or_create(loan=instance)


# auto-create escrow when a loan is created