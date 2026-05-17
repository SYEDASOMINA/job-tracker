import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'job_tracker.settings')
django.setup()

from django.contrib.auth.models import User

# Create superuser
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123456')
    print('Superuser created')

# Create app user
if not User.objects.filter(username='appuser').exists():
    User.objects.create_user('appuser', password='appuser123')
    print('appuser created')
