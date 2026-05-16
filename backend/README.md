<<<<<<< HEAD
# Job Tracker Backend

Django REST API backend for the Job Tracker application.

## Tech Stack
- Python 3.14
- Django 6.0
- Django REST Framework
- PostgreSQL
- Session-based Authentication

## Features
- Full CRUD API for job applications
- Session-based silent authentication
- Resume file upload support
- Django admin panel
- CORS configured for React frontend

## Setup

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd job_tracker_backend
```

### 2. Create virtual environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install django djangorestframework djangorestframework-simplejwt psycopg2-binary django-cors-headers
```

### 4. Setup PostgreSQL
```bash
psql postgres
CREATE DATABASE job_tracker_db;
\q
```

### 5. Run migrations
```bash
python manage.py migrate
```

### 6. Create superuser
```bash
python manage.py createsuperuser
```

### 7. Create app user
```bash
python manage.py shell -c "
from django.contrib.auth.models import User
User.objects.create_user('appuser', password='appuser123')
"
```

### 8. Run server
```bash
python manage.py runserver
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/applications/ | List all applications |
| POST | /api/applications/ | Create new application |
| GET | /api/applications/{id}/ | Get single application |
| PUT | /api/applications/{id}/ | Update application |
| PATCH | /api/applications/{id}/ | Partial update |
| DELETE | /api/applications/{id}/ | Delete application |
| POST | /api/auth/login/ | Login |
| POST | /api/auth/logout/ | Logout |
| GET | /api/auth/me/ | Current user |
| GET | /api/auth/csrf/ | Get CSRF token |

## Admin Panel
Visit `http://127.0.0.1:8000/admin` and login with superuser credentials.
=======
# job-tracker-backend
Django REST API for Job Tracker
>>>>>>> 5ae2ffb584635e9065ea8fad9d66e07266b6522a
