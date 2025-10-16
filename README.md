# AI-Powered Loan Automation Platform  
_A full-stack financial automation system with AI and cloud integration._

**Developed by:** **Bhavana Thakare**

---

## Project Overview

The **AI-Powered Loan Automation Platform** is a full-stack financial application designed to simulate real-world loan servicing operations.  
It supports **customer management, loan creation, EMI tracking, escrow handling, and payment processing**, with planned integration of **AI document classification (AWS Comprehend)** and **automation (Celery)**.

This platform is designed as a **Master’s level capstone project**, replicating core features found in enterprise fintech and banking systems.

---

##  Current Features (Phase 1 - Backend Completed )

- ✅ Django REST API with full CRUD support  
- ✅ Models: Customer, Loan, Escrow, Payment  
- ✅ Auto Escrow creation for every new loan  
- ✅ Admin Panel enabled (Django Admin)  
- ✅ Postman Collection for API testing  
- ✅ Ready for financial logic & AI enhancements

---

##  Upcoming Enhancements (Phase 2+)

| Feature | Technology |
|---------|-----------|
| EMI/Interest Breakdown | Financial Logic in Django |
| Automated Payment Processing | Celery + Redis |
| AI Loan Document Analysis | AWS Comprehend |
| User Authentication | JWT / Django Auth |
| React Admin Dashboard | React + Tailwind + Axios |
| Cloud Deployment | AWS EC2 + RDS + Vercel |

---

## Tech Stack (Current & Future)

| Layer | Technology |
|------|------------|
| Backend | Django REST Framework |
| Database | SQLite (Dev) → PostgreSQL (Production) |
| Task Queue | Celery + Redis |
| AI Services | AWS Comprehend (Planned) |
| Frontend | React + Tailwind (Planned) |
| Deployment | AWS EC2, RDS, Vercel (Planned) |

---

##  Local Setup (Backend Only - Current Phase)

```bash
# 1️⃣ Clone Repository
git clone https://github.com/bhavanathakare09/AI-Powered-Loan-Automation-Platform.git
cd AI-Powered-Loan-Automation-Platform

# 2️⃣ Create & Activate Virtual Environment
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
# venv\Scripts\activate    # Windows

# 3️⃣ Install Dependencies
pip install -r requirements.txt

# 4️⃣ Run Migrations
python manage.py makemigrations
python manage.py migrate

# 5️⃣ Create Superuser (Admin Access)
python manage.py createsuperuser

# 6️⃣ Start Server
python manage.py runserver



# Loan Servicing Simulator 🏦

A Django-based Intelligent Loan Servicing system that simulates real mortgage workflows like payment tracking, escrow management, and compliance validation.

## Features
- AI-powered document classification using AWS Comprehend  
- Real-time loan payment simulation  
- REST API with Django REST Framework  
- PostgreSQL & AWS-ready deployment  

## Run Locally
```bash
python manage.py runserver

