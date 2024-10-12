from django.db import models
from django.contrib.auth.models import User as DjangoUser

class User(models.Model):
    user        = models.OneToOneField(DjangoUser, related_name='profile', on_delete=models.CASCADE )
    avatar_path = models.CharField(max_length=150)
    friends     = models.ManyToManyField(
                    'User', 
                    related_name='users', 
                    default=None,
                    blank=True,
                    null=True 
                  )

    def add_friend(self, friend ) -> None:
        self.friends.add(friend);

        friend.friends.add(self)


# Create your models here.




