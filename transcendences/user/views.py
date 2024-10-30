from django.shortcuts import render, redirect

from django.contrib.auth.decorators import login_required

from django.contrib.auth import authenticate, login, logout

from django.views.decorators.csrf import csrf_protect

from django.http import JsonResponse

from django.http import HttpResponse

from urllib.parse import urlencode, quote_plus

from django.contrib.auth.models import User as DjangoUser

from django.core import serializers

from .models import User

from .service import UserService

from .decorators import ajax_login_required

from django.conf import settings

import base64

import requests

import json

import urllib

from django.core.exceptions import ValidationError

# Create your views here.

API_USER = 'https://api.intra.42.fr/v2/me'

def not_found(request):
    return render(request, '404.html')

def index(request):
    return render(request, 'index.html')
    
def home(request):
    return render(request, 'home.html')

def login_view(request):
    return render(request, 'login.html')

def register_view(request):
    return render(request, 'register.html')

def update_view(request):
    return render(request, 'update.html', { 'user': request.user })

def login_ft(request):
    protocol = request.scheme
    port     = '%3A8443' if protocol == "https" else '%3A8000'
    host     =  request.get_host().split(':')[0]

    params   = {
        'client_id': settings.UID, 
        'redirect_uri': f'{protocol}://0.0.0.0:8000/api/user/callback', 
        'response_type':'code' 
    }

    api_url  = "https://api.intra.42.fr/oauth/authorize?" + urlencode( params , quote_via=quote_plus)
    
    return redirect(api_url)

def handle_42_callback(request, code):
	port         = '8443' if request.scheme == 'https' else '8000'
	host         = request.get_host().split(':')[0]
	redirect_uri = request.scheme + f"://{host}:" + port + '/api/user/callback'
	token_url    = "https://api.intra.42.fr/oauth/token"
	token_params = {
		'grant_type': 'authorization_code',
		'client_id': settings.UID,
		'client_secret': settings.SECRET,
		'code': code,
		'redirect_uri': redirect_uri
	}

	response = requests.post(token_url, data=token_params)

	if response.status_code == 200:
		token_data = response.json()
		access_token = token_data['access_token']
		return access_token 
	else:
		return None

def make_api_request_with_token(api_url, token):
    headers = {'Authorization': f'Bearer {token}'}
    try:
        response = requests.get(api_url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            return data
        else:
            return None
    except requests.RequestException as e:
        return None


def authenticate_42_user(email, username):
	try:
		user = DjangoUser.objects.get(email=email)
		return user
	except DjangoUser.DoesNotExist:
		pass

	try:
		user = DjangoUser.objects.get(username=username)
		return user
	except DjangoUser.DoesNotExist:
		return None


def	connect_42_user(request, response_data):
    
    user = authenticate_42_user(email=response_data['email'], username=response_data['login'])
    
    if user is not None:
        login(request, user)
        user.profile.set_status(True)
        return redirect('home')
    
    photo_url  = response_data['image']['link']
    
    avatarpath = ""
 	
    print(response_data)
    
    
    if response_data['image']['link'] is None:
        avatar_path = UserService.persistFile( open('/app/user/static/homer.png', 'rb'), 'homer.png')
    else:
        with urllib.request.urlopen(photo_url) as file:
            avatar_path = UserService.persistFile(file, response_data['login'])
	
    user = User.create(
		username      = response_data['login'],
		email         = response_data['email'],
        avatar        = avatar_path,
        first_name    = response_data['first_name'],
        last_name     = response_data['last_name']
	)
	
    login(request, user.manager)
    
    return redirect('home')

def callback(request):
    if request.method == 'GET' and 'code' in request.GET:
        code = request.GET['code']

    if request.method == 'GET' and 'code' not in request.GET:
        print('Nao autorizado')
        return JsonResponse({'authenticated': False}, status=401)
        
    response_token = handle_42_callback(request, code)
    
    if response_token is None:
        print('Nao autorizado')
        return JsonResponse({'authenticated': False}, status=401)
    
    response_data = make_api_request_with_token(API_USER, response_token)
	
    if response_data is None:
        return JsonResponse({'authenticated': False}, status=401)
    return connect_42_user(request, response_data)


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
        request.user.profile.set_status(True)
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
        request.user.profile.set_status(False);
        logout(request)
        return JsonResponse({'message': 'Logout realizado com sucesso'})
    return JsonResponse({'error': 'Método não permitido'}, status=405)

def create_user(request):
    
    if request.method != 'POST' and request.method != 'PATCH':
        return JsonResponse({ 'message': ' Router Not found' }, status=404)

    try:
        params = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON payload.'}, status=400)

    try:
        if params.get('avatar') is not None:
            avatar = UserService.persist(params['avatar'])
        else:
            avatar = UserService.persistFile(open('/app/user/static/homer.png', 'rb'), 'homer.png')

        if request.method == 'POST':
            user = User.create(
                username   = params.get('username'), 
                email      = params.get('email'), 
                password   = params.get('password'), 
                avatar     = avatar,
                first_name = params.get('firstname'),
                last_name  = params.get('lastname')
            )
            return JsonResponse( { 'message': 'Usuario criado com sucesso', 'user': user.to_hash() }, status=200)
            
            
        if request.method == 'PATCH':
            user = User.update(
                user       = request.user,
                username   = params.get('username'), 
                email      = params.get('email'), 
                password   = params.get('password'), 
                avatar     = avatar,
                first_name = params.get('firstname'),
                last_name  = params.get('lastname')
            )
            return JsonResponse( { 'message': 'Usuario Atualizado com sucesso', 'user': user.to_hash() }, status=200)
    except ValidationError as ve:
        error_message = ' '.join(ve.messages)
        return JsonResponse({'error': error_message}, status=400)
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
    
@csrf_protect
@login_required
def user_add_friend(request):
    if request.method != 'POST':
        return JsonResponse({ 'message': ' Router Not found' }, status=404) 

    params    = json.loads(request.body)
    friendID  = params.get('newFriendID')
    friend    = User.objects.get(pk=friendID)
    
    try:
        request.user.profile.add_friend(friend)
        return JsonResponse( { 'message': 'Amigos adicionados com sucesso' }, status=200)
    except Exception as error:
        return JsonResponse( { 'message': str(error)  }, status=500)

@login_required
def profiles_list(request):
    if request.method != 'GET':
        return JsonResponse({ 'error': ' Router Not found' }, status=404)

    print(request.user.profile)

    return JsonResponse( request.user.profile.friend_and_users_relation(), status=200, safe=False)

@login_required
def user_friends(request):
    if request.method != 'GET':
        return JsonResponse({ 'message': ' Router Not found' }, status=404)
    return JsonResponse( list(map(lambda user: user.to_hash(),
                     request.user.profile.friends.all())),
                     status=200,
                     safe=False)

@csrf_protect
@login_required
def remove_friends(request):
    if request.method != 'POST':
        return JsonResponse({ 'message': ' Router Not found' }, status=404) 

    params    = json.loads(request.body)
    friendID  = params.get('removeFriendID')
    friend    = User.objects.get(pk=friendID)
    
    try:
        request.user.profile.remove_friend(friend)
        return JsonResponse( { 'message': 'Amigo removido com sucesso' }, status=200)
    except Exception as error:
        return JsonResponse( { 'message': str(error)  }, status=500)
    
@login_required
def user_online_status(request):
    if request.method != 'POST':
        return JsonResponse({ 'error': ' Router Not found' }, status=404)
    
    status = request.POST.get('status')
    
    try:
        request.user.profile.update_status(status)
        return JsonResponse( { 'message': 'Status atualizado com sucesso' }, status=200)
    except Exception as error:
        return JsonResponse( { 'message': str(error)  }, status=500)
