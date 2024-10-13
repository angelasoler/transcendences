from django.db import models
from django.contrib.auth.models import User

class Score(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    points = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.user.username}: {self.points}"


class Room(models.Model):
    game_id = models.CharField(max_length=100, unique=True)
    players = models.IntegerField(default=1)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def is_full(self):
        return self.players >= 2

    def is_empty(self):
        return self.players <= 0

    def __str__(self):
        return f"Room {self.game_id} - Players: {self.players} - Active: {self.is_active}"