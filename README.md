# 🗂 Job Tracker — Full Stack Application

A modern Job Application Tracker built with React and Django REST Framework, backed by PostgreSQL. Track every application from submission to offer with a beautiful UI.

---

## 🌐 Live Links

| | Link |
|--|------|
| 🖥 Frontend | https://job-tracker-six-orcin.vercel.app |
| ⚙️ Backend API | https://job-tracker-a7yr.onrender.com/api/applications/ |
| 🔧 Admin Panel | https://job-tracker-a7yr.onrender.com/admin |
| 📁 GitHub Repo | https://github.com/SYEDASOMINA/job-tracker |

---

## 📁 Project Structure

```
job-tracker/
├── backend/          # Django REST API + PostgreSQL
│   ├── accounts/     # JWT Auth — login, logout, me
│   ├── applications/ # CRUD API for job applications
│   └── job_tracker/  # Django settings and URLs
└── frontend/         # React UI
    └── src/
        ├── App.js         # Main app — all views and logic
        └── setupProxy.js  # Dev proxy to Django
```

---

## ✨ Features

- 📋 List View — sortable, searchable, filterable applications
- 🗂 Kanban Board — drag and drop across status columns
- 📊 Charts — status breakdown, top companies, priority split, monthly timeline
- ⭐ Star applications — bookmark important ones
- 🔔 Interview Reminders — alerts for interviews within 7 days
- 📎 Resume Upload — attach PDF or Word files
- ⬇️ CSV Export — download all data as CSV
- 🌙 Dark Mode — toggle light and dark themes

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, CSS-in-JS, Fetch API |
| Backend | Django 6, Django REST Framework |
| Database | PostgreSQL |
| Auth | JWT (JSON Web Tokens) |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |
| DB Hosting | Render PostgreSQL |

---

## 🚀 Deployment Flow

```
Developer pushes code to GitHub
        ↓
┌───────────────────┐     ┌───────────────────┐
│     Vercel        │     │      Render        │
│  (Auto deploys    │     │  (Auto deploys     │
│   frontend on     │     │   backend on       │
│   every push)     │     │   every push)      │
└───────────────────┘     └───────────────────┘
        ↓                          ↓
React app live on            Django API live on
  Vercel CDN                  Render server
        ↓                          ↓
        └──────── talks to ────────┘
                      ↓
              PostgreSQL Database
               (Render managed)
```

### Frontend — Vercel
- Connected to GitHub repo
- Auto-deploys on every push to `main`
- Serves React app globally via CDN
- Free tier — unlimited deployments

### Backend — Render
- Connected to GitHub repo
- Auto-deploys on every push to `main`
- Runs Django with Gunicorn WSGI server
- Build command: `pip install -r requirements.txt && python manage.py migrate && python create_users.py`
- Start command: `gunicorn job_tracker.wsgi:application`
- Free tier — spins down after 15 min inactivity

### Database — Render PostgreSQL
- Managed PostgreSQL on Render
- Connected via `DATABASE_URL` environment variable
- Free tier — 1GB storage

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login/ | JWT login — returns access token |
| GET | /api/auth/me/ | Current logged in user |
| GET | /api/applications/ | List all applications |
| POST | /api/applications/ | Create new application |
| GET | /api/applications/{id}/ | Get single application |
| PUT | /api/applications/{id}/ | Update application |
| PATCH | /api/applications/{id}/ | Partial update (star, status) |
| DELETE | /api/applications/{id}/ | Delete application |

---

## 🗄 Database Model

```
JobApplication
├── user           → linked to auth user
├── name           → applicant name
├── company        → company name
├── job_title      → role applied for
├── status         → Applied | Interview | Offer | Rejected
├── priority       → Low | Medium | High
├── date_applied   → date of application
├── interview_date → scheduled interview date
├── salary         → salary range
├── contact_name   → recruiter name
├── contact_email  → recruiter email
├── notes          → free-form notes
├── starred        → bookmarked flag
├── resume         → uploaded resume file
├── created_at     → auto timestamp
└── updated_at     → auto timestamp
```

---

## 🏃 Run Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
Runs at http://127.0.0.1:8000

### Frontend
```bash
cd frontend
npm install
npm start
```
Runs at http://localhost:3000

---

## 👩‍💻 Author

**Syeda Somina**
GitHub: https://github.com/SYEDASOMINA
