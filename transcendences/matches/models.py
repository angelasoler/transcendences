from django.db import models
from django.contrib.auth.models import User

class Match(models.Model):
    player1 = models.ForeignKey(User, related_name='matches_as_player1', on_delete=models.CASCADE)
    player2 = models.ForeignKey(User, related_name='matches_as_player2', on_delete=models.CASCADE)
    winner = models.ForeignKey(User, related_name='matches_won', on_delete=models.CASCADE)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.player1.username} vs {self.player2.username} on {self.date.strftime('%Y-%m-%d %H:%M')}"

