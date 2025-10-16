# loan_app/urls.py
# loan_app/urls.py
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, LoanViewSet, EscrowViewSet, PaymentViewSet

router = DefaultRouter()
router.register(r"customers", CustomerViewSet, basename="customer")
router.register(r"loans", LoanViewSet, basename="loan")
router.register(r"escrows", EscrowViewSet, basename="escrow")
router.register(r"payments", PaymentViewSet, basename="payment")

urlpatterns = router.urls

