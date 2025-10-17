from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from loan_app.views import (
    CustomerViewSet,
    LoanViewSet,
    EscrowViewSet,
    PaymentViewSet,
    me,
    ai_query,
)

router = DefaultRouter()
router.register(r"customers", CustomerViewSet, basename="customer")
router.register(r"loans", LoanViewSet, basename="loan")
router.register(r"escrows", EscrowViewSet, basename="escrow")
router.register(r"payments", PaymentViewSet, basename="payment")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/me/", me, name="me"),
    path("api/ai/query/", ai_query, name="ai_query"),
    path("api/", include(router.urls)),
    
]
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from loan_app.views import (
    CustomerViewSet,
    LoanViewSet,
    EscrowViewSet,
    PaymentViewSet,
    me,
    ai_query,
)

router = DefaultRouter()
router.register(r"customers", CustomerViewSet, basename="customer")
router.register(r"loans", LoanViewSet, basename="loan")
router.register(r"escrows", EscrowViewSet, basename="escrow")
router.register(r"payments", PaymentViewSet, basename="payment")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/me/", me, name="me"),
    path("api/ai/query/", ai_query, name="ai_query"),
    path("api/", include(router.urls)),
]