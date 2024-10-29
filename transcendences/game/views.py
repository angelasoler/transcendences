from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_protect, csrf_exempt
from django.db import transaction
from django.conf import settings
from django.utils.html import escape
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
		tournament_name = escape(data.get('name'))
		players = [escape(player) for player in data.get('players', [])]

		if not tournament_name or not players:
			return JsonResponse({'error': 'Invalid data', 'success': False}, status=400)

		# Shuffle players to randomize matches
		random.shuffle(players)

		# Add a "bye" if the number of players is odd
		if len(players) % 2 != 0:
			players.append('Bye')

		# Create matches grouped by round
		rounds = []
		current_round = []
		for i in range(0, len(players), 2):
			current_round.append({'player1': players[i], 'player2': players[i + 1]})
		rounds.append(current_round)

		tournament_id = str(uuid.uuid4())
		tournament_data = {
			'name': tournament_name,
			'rounds': rounds
		}

		# Assuming you have a Redis client set up to store tournament data
		redis_client.set(tournament_id, json.dumps(tournament_data))

		return JsonResponse({'tournament_id': tournament_id, 'success': True})
	return JsonResponse({'error': 'Método não permitido', 'success': False}, status=405)

def get_tournament_matches(request, tournament_id):
    tournament_data = redis_client.get(tournament_id)
    if not tournament_data:
        return JsonResponse({'error': 'Tournament not found'}, status=404)

    tournament_data = json.loads(tournament_data)
    return JsonResponse(tournament_data)

def update_tournament_rounds(tournament_id, new_round):
    tournament_data = redis_client.get(tournament_id)
    if not tournament_data:
        return {'error': 'Tournament not found'}

    tournament_data = json.loads(tournament_data)
    tournament_data['rounds'].append(new_round)
    redis_client.set(tournament_id, json.dumps(tournament_data))
    return {'success': True}

@csrf_exempt
def update_bracket(request, tournament_id):
    if request.method == 'POST':
        data = json.loads(request.body)
        winner = data.get('winner')

        tournament_data = redis_client.get(tournament_id)
        if not tournament_data:
            return JsonResponse({'error': 'Tournament not found'}, status=404)

        tournament_data = json.loads(tournament_data)
        rounds = tournament_data['rounds']

        # Find the current round and match
        for round in rounds:
            for match in round:
                if 'winner' not in match:
                    match['winner'] = winner
                    break

        # Check if the current round is complete
        current_round_complete = all('winner' in match for match in rounds[-1])

        if current_round_complete:
            # Generate the next round only if there is no winner yet
            if 'winner' not in tournament_data:
                winners = [match['winner'] for match in rounds[-1]]
                if len(winners) == 1:
                    # Tournament has ended
                    tournament_data['winner'] = winners[0]
                else:
                    new_round = []
                    for i in range(0, len(winners), 2):
                        if i + 1 < len(winners):
                            new_round.append({'player1': winners[i], 'player2': winners[i + 1]})
                        else:
                            new_round.append({'player1': winners[i], 'player2': 'Bye'})
                    tournament_data['rounds'].append(new_round)

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
        rounds = tournament_data['rounds']

        # Check if the tournament has ended
        if 'winner' in tournament_data:
            return JsonResponse({'winner': tournament_data['winner']})

        # Find the next match without a winner
        for round in rounds:
            for match in round:
                if 'winner' not in match:
                    return JsonResponse({'match': match})

        return JsonResponse({'error': 'No more matches available'}, status=400)
    return JsonResponse({'error': 'Método não permitido'}, status=405)