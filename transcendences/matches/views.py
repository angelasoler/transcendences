from django.shortcuts import render

from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .models import Match
from django.db.models import Q
from django.views.decorators.csrf import csrf_protect
import json
from django.contrib.auth.models import User

@csrf_protect
@login_required
def create_match(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        opponent_username = data.get('opponent')
        this_username = data.get('username')
        result = data.get('result')  # 'username'
        try:
            opponent = User.objects.get(username=opponent_username)
            user = User.objects.get(username=this_username)
            winner = user if result == this_username else opponent
            Match.objects.create(
                player1=user,
                player2=opponent,
                winner=winner
            )
            return JsonResponse({'status': 'success'})
        except User.DoesNotExist:
            return JsonResponse({'error': 'Opponent not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Invalid request'}, status=400)


@login_required
def user_matches(request):
    user = request.user
    matches = Match.objects.filter(Q(player1=user) | Q(player2=user)).order_by('-date')
    data = []
    for match in matches:
        opponent = match.player2 if match.player1 == user else match.player1
        data.append({
            'opponent': opponent.username,
            'date': match.date.strftime('%Y-%m-%d %H:%M'),
            'result': 'Win' if match.winner == user else 'Loss'
        })
    return JsonResponse({'matches': data})

@login_required
def user_stats(request):
    user = request.user
    total_matches = Match.objects.filter(Q(player1=user) | Q(player2=user)).count()
    wins = Match.objects.filter(winner=user).count()
    losses = total_matches - wins
    return JsonResponse({'wins': wins, 'losses': losses})

