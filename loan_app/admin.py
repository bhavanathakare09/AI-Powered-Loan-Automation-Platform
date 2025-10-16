from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Customer, Loan, Payment, EscrowAccount

admin.site.register(Customer)
admin.site.register(Loan)
admin.site.register(Payment)
admin.site.register(EscrowAccount)



