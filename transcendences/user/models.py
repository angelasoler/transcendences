from django.db import models
from django.db import transaction

from django.contrib.auth.models import User as DjangoUser

from .service import UserService

# Garantindo que os emails sejam unicos
DjangoUser._meta.get_field('email')._unique = True
# Garantindo que os emails sejam unicos
DjangoUser._meta.get_field('first_name')._null = True
#Garantindo que os emails sejam unicos
DjangoUser._meta.get_field('last_name')._null  = True

class User(models.Model):
    manager     = models.OneToOneField(DjangoUser, related_name='profile', on_delete=models.CASCADE, unique=True )
    avatar_path = models.CharField(max_length=150)
    created_at  = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    updated_at  = models.DateTimeField(auto_now=True, blank=True, null=True)
    friends     = models.ManyToManyField('User', related_name='users', default=None, blank=True, null=True)
    wins        = models.IntegerField(default=0)
    loses       = models.IntegerField(default=0)

    def add_friend(self, friend ) -> None:
        self.friends.add(friend);

        friend.friends.add(self)

    def to_hash(self):
      return {
        'first_name': self.manager.first_name,
        'last_name':  self.manager.last_name,
        'created_at': self.created_at,
        'updated_at': self.updated_at
      }

    @transaction.atomic
    def add_friends( self, list_of_friends : list ) -> bool:

      friends = User.objects.filter(pk__in=list_of_friends)

      if len(friends) != len(list_of_friends):
        raise 'A lista de Amigos passada é invalida '

      self.friends.add(*friends)

      self.save()

      return True;

    def first_name(self):
      return self.manager.first_name

    @staticmethod
    def create(**kwargs):

      if DjangoUser.objects.filter(username=kwargs.get('username')).exists():
        raise Exception('Esse username já existe')

      if DjangoUser.objects.filter(email=kwargs.get('email')).exists():
        raise Exception('Esse email já existe')

      manager = DjangoUser.objects.create_user(
        kwargs.get('username'),
        kwargs.get('email'),
        kwargs.get('password'),
        first_name = kwargs.get('first_name'),
        last_name  = kwargs.get('last_name' )
      )

      return User.objects.create(
        manager=manager,
        avatar_path=kwargs.get('avatar')
      )
      
    @staticmethod
    def update(**kwargs):
      
      user = kwargs.get('user')

      if DjangoUser.objects.filter(username=kwargs.get('username')).exists() and user.username != kwargs.get('username'):
        raise Exception('Esse username já existe')

      if (DjangoUser.objects.filter(email=kwargs.get('email')).exists() and user.email != kwargs.get('email')):
        raise Exception('Esse email já existe')
      
      user.username            = kwargs.get('username')
      user.email               = kwargs.get('email')
      user.first_name          = kwargs.get('first_name')
      user.last_name           = kwargs.get('last_name')
      user.profile.avatar_path = kwargs.get('avatar')

      user.set_password(kwargs.get('password'))

      user.save()
      user.profile.save()

      return user.profile
    
    @staticmethod
    def find_by(**kwargs):

      if (kwargs.get('email') is not None):
        return DjangoUser.objects.get( email = kwargs.get('email'))

      if (kwargs.get('username') is not None):
        return DjangoUser.objects.get( username = kwargs.get('username'))

      return None

# Create your models here.




