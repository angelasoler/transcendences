from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_protect
from django.db import transaction
from .decorators import ajax_login_required
from .models import Room
import uuid
import json

def index(request):
    return render(request, 'index.html')

def not_found(request):
    return render(request, '404.html')

def no_cache(view):
    def view_wrapper(request, *args, **kwargs):
        response = view(request, *args, **kwargs)
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response
    return view_wrapper


@ajax_login_required
@csrf_protect
def join_or_create_room(request):
    if request.method == 'POST':
        with transaction.atomic():
            room = Room.objects.select_for_update().filter(players__lt=2, is_active=True).first()
            if room:
                return JsonResponse({'game_id': room.game_id})
            else:
                game_id = str(uuid.uuid4())
                room = Room.objects.create(game_id=game_id, created_by=request.user, players=0)
                return JsonResponse({'game_id': game_id})
    return JsonResponse({'error': 'Método não permitido'}, status=405)

def game_room(request, room_name):
    return render(request, 'game/room.html', {
        'room_name': room_name
    })

