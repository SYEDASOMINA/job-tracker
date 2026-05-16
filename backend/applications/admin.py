from django.contrib import admin
from .models import JobApplication

@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'job_title', 'status', 'priority', 'starred', 'created_at']
    list_filter = ['status', 'priority', 'starred']
    search_fields = ['name', 'company', 'job_title']
