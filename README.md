# 🗂 Job Tracker — Full Stack Application

A modern, production-ready **Job Application Tracker** built with React and Django REST Framework, backed by PostgreSQL. Track every job application from submission to offer, visualize your progress, and manage your job search efficiently.

---

## 📸 Overview

This is a full-stack monorepo containing:

| Folder | Description |
|--------|-------------|
| `frontend/` | React app — UI, views, and API integration |
| `backend/` | Django REST API — models, serializers, endpoints |

---

## ✨ Features

### 📋 List View
- View all job applications in a clean, sortable list
- Inline edit — edit any application without leaving the page
- Star important applications for quick access
- Delete applications with one click

### 🗂 Kanban Board
- Four columns: **Applied → Interview → Offer → Rejected**
- Drag and drop cards to update application status instantly

### 📊 Charts & Analytics
- **Status Breakdown** — see how many applications are in each stage
- **Top Companies** — which companies you've applied to most
- **Priority Split** — Low / Medium / High priority distribution
- **Monthly Timeline** — track your application activity over time
- **Success Rate** — offer rate as a percentage
- **Interview Rate** — how often you're getting interviews

### 🔍 Filter & Search
- Filter by status: All, Applied, Interview, Offer, Rejected
- Search by name, company, role, or contact person
- Sort by: Newest, Oldest, Company A–Z, Priority, Starred first

### 🔔 Interview Reminders
- Automatic banner for interviews scheduled within the next 7 days

### 📎 Resume Upload
- Attach PDF or Word resume files to each application

### ⬇️ CSV Export
- Download all applications as a CSV file for offline use

### 🌙 Dark Mode
- Toggle between light and dark themes

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| CSS-in-JS | Dynamic inline styling and theming |
| Fetch API | HTTP requests to Django backend |
| http-proxy-middleware | Proxy API calls during development |

### Backend
| Technology | Purpose |
|------------|---------|
| Django 6 | Web framework |
| Django REST Framework | REST API |
| PostgreSQL | Production database |
| django-cors-headers | Cross-origin request handling |
| Session Authentication | Secure cookie-based auth |

---

## 📁 Project Structure

```
job-tracker/
│
├── backend/                        # Django REST API
│   ├── accounts/                   # Auth — login, logout, CSRF
│   │   ├── views.py
│   │   └── urls.py
│   ├── applications/               # Job application CRUD
│   │   ├── models.py               # JobApplication model
│   │   ├── serializers.py          # DRF serializers
│   │   ├── views.py                # ViewSet
│   │   ├── urls.py                 # API routes
│   │   └── admin.py                # Django admin config
│   ├── job_tracker/
│   │   ├── settings.py             # Django settings
│   │   └── urls.py                 # Root URL config
│   └── manage.py
│
├── frontend/                       # React App
│   ├── src/
│   │   ├── App.js                  # Main component — all views and logic
│   │   ├── setupProxy.js           # Proxy config to Django
│   │   └── index.js                # React entry point
│   └── package.json
│
└── README.md
```

---

## 🗄 Database Model

```python
class JobApplication(models.Model):
    user           = ForeignKey(User)       # linked to auth user
    name           = CharField             # applicant name
    company        = CharField             # company name
    job_title      = CharField             # role applied for
    status         = CharField             # Applied | Interview | Offer | Rejected
    priority       = CharField             # Low | Medium | High
    date_applied   = DateField             # when applied
    interview_date = DateField             # scheduled interview
    salary         = CharField             # salary range
    contact_name   = CharField             # recruiter/contact
    contact_email  = EmailField            # contact email
    notes          = TextField             # free-form notes
    starred        = BooleanField          # bookmarked
    resume         = FileField             # uploaded resume
    created_at     = DateTimeField         # auto timestamp
    updated_at     = DateTimeField         # auto timestamp
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications/` | List all applications |
| POST | `/api/applications/` | Create new application |
| GET | `/api/applications/{id}/` | Get single application |
| PUT | `/api/applications/{id}/` | Update full application |
| PATCH | `/api/applications/{id}/` | Partial update (star, status) |
| DELETE | `/api/applications/{id}/` | Delete application |
| GET | `/api/auth/csrf/` | Get CSRF token |
| POST | `/api/auth/login/` | Session login |
| POST | `/api/auth/logout/` | Session logout |
| GET | `/api/auth/me/` | Current logged in user |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

---

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate       # Mac/Linux
venv\Scripts\activate          # Windows

# Install dependencies
pip install django djangorestframework djangorestframework-simplejwt psycopg2-binary django-cors-headers

# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE job_tracker_db;"

# Update settings.py with your database credentials
# DATABASES -> NAME, USER, PASSWORD

# Run migrations
python manage.py migrate

# Create superuser for admin panel
python manage.py createsuperuser

# Create background app user
python manage.py shell -c "
from django.contrib.auth.models import User
User.objects.create_user('appuser', password='appuser123')
"

# Start the server
python manage.py runserver
```

Backend runs at `http://127.0.0.1:8000`
Admin panel at `http://127.0.0.1:8000/admin`

---

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

Frontend runs at `http://localhost:3000`

---

### How They Connect

The React app uses a proxy (`setupProxy.js`) to forward all `/api/` requests to Django at port 8000. This allows session cookies to work correctly across both servers during development.

```
React (port 3000) → proxy → Django (port 8000) → PostgreSQL
```

On startup, React silently logs in as `appuser` in the background — no manual login needed.

---

## 🖥 Admin Panel

Django admin is available at `http://127.0.0.1:8000/admin`

Login with your superuser credentials to:
- View all job applications in the database
- Add, edit, delete entries manually
- Filter and search across all records
- Manage users

---

## 👩‍💻 Author

**Syeda Somina**
- GitHub: [@SYEDASOMINA](https://github.com/SYEDASOMINA)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
