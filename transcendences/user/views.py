from django.shortcuts import render

from django.contrib.auth.decorators import login_required

from django.contrib.auth import authenticate, login, logout

from django.views.decorators.csrf import csrf_protect

from django.http import JsonResponse

from django.http import HttpResponse

from .models import User

from .service import UserService

from .decorators import ajax_login_required

import base64

import json

# Create your views here.

def not_found(request):
    return render(request, '404.html')

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
@no_cache
def login_user(request):
    if request.method != 'POST':
        return JsonResponse({ 'message': ' Router Not found' }, status=404) 
    

    params = json.loads(request.body)

    password = params.get('password')
    username = params.get('username')

    if (username is None or password is None):
        return JsonResponse({ 'error': 'Faltando parametros, informe o username e a senha' }, status=404)

    user = authenticate(request, username=username, password=password)
    
    if (user is not None):
        login(request, user)
        return JsonResponse({'message': 'Login realizado com sucesso'}, status=200)

    return JsonResponse({'error': 'Credenciais inválidas'}, status=403)

@ajax_login_required
@csrf_protect
@no_cache
@login_required
def profile_user(request):
    if request.method != 'GET':
        return JsonResponse({ 'error': ' Router Not found' }, status=404) 
    return JsonResponse({
        'username':  request.user.username,
        'email':     request.user.email,
        'photo':     UserService.restore(request.user),
        'extension': request.user.profile.avatar_path.split('.')[-1]
    }, status=200)


@csrf_protect
@login_required
def logout_user(request):
    if request.method == 'POST':
        logout(request)
        return JsonResponse({'message': 'Logout realizado com sucesso'})
    return JsonResponse({'error': 'Método não permitido'}, status=405)

def create_user(request):

    if request.method != 'POST':
        return JsonResponse({ 'message': ' Router Not found' }, status=404) 

    if request.FILES.get('avatar') is not None:
        avatar = UserService.persist(request.FILES.get('avatar').file, request.FILES.get('avatar').name)
    else:
        avatar = UserService.persist( open('/app/user/static/homer.png', 'rb'), 'homer.png')

    params = json.loads(request.body)

    try:
        user = User.create(
            username   = params.get('username'), 
            email      = params.get('email'), 
            password   = params.get('password'), 
            avatar     = avatar,
            first_name = params.get('firstname'),
            last_name  = params.get('lastname')
        )
        return JsonResponse( { 'message': 'Usuario criado com sucesso', 'user': user.to_hash() }, status=200)
    except Exception as error:
        return JsonResponse( { 'error': str(error) }, status=500)

@login_required
def update_user(request):
    if request.method != 'POST':
        return JsonResponse({ 'message': ' Router Not found' }, status=404)     
    try:
        user = User.update(
            id         = request.POST.get('id'),
            username   = request.POST.get('username'), 
            email      = request.POST.get('email'), 
            password   = request.POST.get('password'), 
            avatar     = request.FILES.get('avatar') if request.FILES.get('avatar') is not None else None,
            first_name = request.POST.get('first_name'),
            last_name  = request.POST.get('last_name')
        )
        return JsonResponse( { 'message': 'Usuario atualizado com sucesso', 'user': user.to_hash() }, status=200)
    except Exception as error:
        return JsonResponse( { 'message': str(error)  }, status=500)

@login_required
def user_add_friend(request):
    if request.method != 'POST':
        return JsonResponse({ 'message': ' Router Not found' }, status=404) 
    
    friends = request.POST.getlist('newFriends')
    
    try:
        request.user.profile.add_friends( friends )
        return JsonResponse( { 'message': 'Amigos adicionados com sucesso' }, status=200)
    except Exception as error:
        return JsonResponse( { 'message': str(error)  }, status=500)

