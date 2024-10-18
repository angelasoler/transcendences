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

def login_view(request):
    return render(request, 'login.html')

def register_view(request):
    return render(request, 'register.html')

def check_auth(request):
    if request.user.is_authenticated:
        return JsonResponse({'authenticated': True})
    else:
        return JsonResponse({'authenticated': False}, status=401)

def no_cache(view):
    def view_wrapper(request, *args, **kwargs):
        response = view(request, *args, **kwargs)
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response
    return view_wrapper

@csrf_protect
def register_user(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if User.objects.filter(username=username).exists():
            return JsonResponse({'error': 'Nome de usuário já existe'}, status=400)
        if User.objects.filter(email=email).exists():
            return JsonResponse({'error': 'Email já está em uso'}, status=400)
        User.objects.create_user(username=username, email=email, password=password)
        return JsonResponse({'message': 'Usuário registrado com sucesso'})
    return JsonResponse({'error': 'Método não permitido'}, status=405)

@csrf_protect
@no_cache
def login_user(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')

        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return JsonResponse({'message': 'Login realizado com sucesso'})
        else:
            return JsonResponse({'error': 'Credenciais inválidas'}, status=400)
    return JsonResponse({'error': 'Método não permitido'}, status=405)

@csrf_protect
def logout_user(request):
    if request.method == 'POST':
        logout(request)
        return JsonResponse({'message': 'Logout realizado com sucesso'})
    return JsonResponse({'error': 'Método não permitido'}, status=405)

@ajax_login_required
@csrf_protect
@no_cache
def get_profile(request):
    user = request.user
    data = {
        'username': user.username,
        'email': user.email,
    }
    return JsonResponse(data)

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

