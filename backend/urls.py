# backend/urls.py

from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

# ✅ Import views directly from loan_app
from loan_app.views import (
    CustomerViewSet,
    LoanViewSet,
    EscrowViewSet,
    PaymentViewSet,
    me,
    ai_query,
)

from rest_framework.routers import DefaultRouter

# Router for ViewSets
router = DefaultRouter()
router.register(r"customers", CustomerViewSet, basename="customer")
router.register(r"loans", LoanViewSet, basename="loan")
router.register(r"escrows", EscrowViewSet, basename="escrow")
router.register(r"payments", PaymentViewSet, basename="payment")

urlpatterns = [
    path("admin/", admin.site.urls),

    # 🔑 JWT Authentication
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # 👤 User profile
    path("api/me/", me, name="me"),

    # 🤖 AI Endpoint
    path("api/ai/query/", ai_query, name="ai_query"),

    # 🧭 API Router
    path("api/", include(router.urls)),
]