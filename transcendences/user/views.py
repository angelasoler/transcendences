from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
import json

# Create your views here.


def index(request):
     return render(request, 'index.html')

def create(request):
    return JsonResponse({ 'message': 'OK' }, status=200)

@login_required
def update(request):
    pass

@login_required
def delete(request):
    pass
