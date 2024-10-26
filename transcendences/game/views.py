from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_protect, csrf_exempt
from django.db import transaction
from django.conf import settings
from .decorators import ajax_login_required
from .models import Room
import uuid
import json
import redis
import random

redis_client = redis.StrictRedis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB
)

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
    print(request.method)
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

@csrf_protect
def create_tournament(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        print("Received data:", data)  # Debug statement
        tournament_name = data.get('name')
        players = data.get('players')

        if not tournament_name or not players:
            return JsonResponse({'error': 'Invalid data'}, status=400)

        # Shuffle players to randomize matchups
        random.shuffle(players)

        # Add a "bye" if the number of players is odd
        if len(players) % 2 != 0:
            players.append('Bye')

        # Create matchups
        matchups = []
        for i in range(0, len(players), 2):
            matchups.append({'player1': players[i], 'player2': players[i + 1]})

        tournament_id = str(uuid.uuid4())
        tournament_data = {
            'name': tournament_name,
            'matchups': matchups
        }

        redis_client.set(tournament_id, json.dumps(tournament_data))

        return JsonResponse({'tournament_id': tournament_id, 'success': True})
    return JsonResponse({'error': 'Método não permitido'}, status=405)

def get_tournament_matchups(request, tournament_id):
    tournament_data = redis_client.get(tournament_id)
    if not tournament_data:
        return JsonResponse({'error': 'Tournament not found'}, status=404)

    tournament_data = json.loads(tournament_data)
    return JsonResponse(tournament_data)

@csrf_exempt
def update_bracket(request, tournament_id):
    if request.method == 'POST':
        data = json.loads(request.body)
        winner = data.get('winner')

        if not winner:
            return JsonResponse({'error': 'Invalid data'}, status=400)

        tournament_data = redis_client.get(tournament_id)
        if not tournament_data:
            return JsonResponse({'error': 'Tournament not found'}, status=404)

        tournament_data = json.loads(tournament_data)
        matchups = tournament_data.get('matchups', [])
        new_matchups = []

        # Update the current matchup with the winner
        for matchup in matchups:
            if 'winner' not in matchup:
                matchup['winner'] = winner
                break

        # Check if all matches in the current round have been played
        all_matches_played = all('winner' in matchup for matchup in matchups)

        if all_matches_played:
            # Form the next round of matches with the winners of the last round
            winners = [matchup['winner'] for matchup in matchups]

            # Pair up winners for the next round
            for i in range(0, len(winners), 2):
                if i + 1 < len(winners):
                    new_matchups.append({'player1': winners[i], 'player2': winners[i + 1]})
                else:
                    # If there's an odd number of winners, the last one gets a placeholder
                    new_matchups.append({'player1': winners[i], 'player2': 'TBD'})

            tournament_data['matchups'] = new_matchups

        redis_client.set(tournament_id, json.dumps(tournament_data))
        return JsonResponse({'success': True})
    return JsonResponse({'error': 'Método não permitido'}, status=405)

@csrf_exempt
def start_next_game(request, tournament_id):
    if request.method == 'POST':
        tournament_data = redis_client.get(tournament_id)
        if not tournament_data:
            return JsonResponse({'error': 'Tournament not found'}, status=404)

        tournament_data = json.loads(tournament_data)
        next_matchup = get_next_matchup(tournament_data)
        if not next_matchup:
            return JsonResponse({'error': 'No more matchups available'}, status=400)

        return JsonResponse({'matchup': next_matchup})
    return JsonResponse({'error': 'Método não permitido'}, status=405)

def get_next_matchup(tournament_data):
    # Example logic to get the next matchup
    # This should be customized based on your tournament structure
    matchups = tournament_data.get('matchups', [])
    for matchup in matchups:
        if 'winner' not in matchup:
            return matchup
    return None