from django.db import models
from django.contrib.auth.models import User

class JobApplication(models.Model):
    STATUS_CHOICES = [
        ('Applied', 'Applied'),
        ('Interview', 'Interview'),
        ('Offer', 'Offer'),
        ('Rejected', 'Rejected'),
    ]
    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
    ]

    user           = models.ForeignKey(User, on_delete=models.CASCADE)
    name           = models.CharField(max_length=200)
    company        = models.CharField(max_length=200)
    job_title      = models.CharField(max_length=200)
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Applied')
    priority       = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='Medium')
    date_applied   = models.DateField(null=True, blank=True)
    interview_date = models.DateField(null=True, blank=True)
    salary         = models.CharField(max_length=100, blank=True)
    contact_name   = models.CharField(max_length=200, blank=True)
    contact_email  = models.EmailField(blank=True)
    notes          = models.TextField(blank=True)
    starred        = models.BooleanField(default=False)
    resume         = models.FileField(upload_to='resumes/', null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} → {self.company}"