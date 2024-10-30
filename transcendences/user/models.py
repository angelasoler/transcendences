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
    friends     = models.ManyToManyField('self', related_name='users', default=None, blank=True)
    wins        = models.IntegerField(default=0)
    loses       = models.IntegerField(default=0)
    is_online   = models.BooleanField(default=False)

    def add_friend(self, friend ) -> None:
        self.friends.add(friend)

        friend.friends.add(self)

    def remove_friend(self, friend ) -> None:
        if self.friends.filter(id=friend.id).exists():
            self.friends.remove(friend)
            friend.friends.remove(self)
            
    
    def friend_and_users_relation(self) -> list:
      friends = self.friends.all()
      
      users   = User.objects.all()
      
      result  = []
      
      for user in users:

        if user == self:
          continue
        
        if user in friends:
          result.append(dict(user.to_hash() | { 'friend': True }))
        else:
          result.append(dict(user.to_hash() | { 'friend': False }))
          
      return result

    def to_hash(self):
      return {
        'id' : self.id,
        'username' : self.manager.username,
        'first_name': self.manager.first_name,
        'last_name':  self.manager.last_name,
        'created_at': self.created_at,
        'updated_at': self.updated_at,
        'is_online' : self.is_online
      }
      
    def set_status(self, status: bool) -> None:
      self.is_online = status
      
      self.save()

    @transaction.atomic
    def add_friends( self, list_of_friends : list ) -> bool:

      friends = User.objects.filter(pk__in=list_of_friends)

      if len(friends) != len(list_of_friends):
        raise 'A lista de Amigos passada é invalida '

      self.friends.add(*friends)

      self.save()

      return True

    def first_name(self):
      return self.manager.first_name

    @staticmethod
    def create(**kwargs):

      # Validate field lengths
      if len(kwargs.get('username')) > 30:
          raise Exception('Nome de usuário não pode ser maior que 30 caracteres.')
      if len(kwargs.get('email')) > 30:
          raise Exception('Email não pode ser maior que 30 caracteres.')
      if kwargs.get('first_name') and len(kwargs.get('first_name')) > 30:
          raise Exception('Primeiro nome não pode ser maior que 30 caracteres.')
      if kwargs.get('last_name') and len(kwargs.get('last_name')) > 30:
          raise Exception('Último nome não pode ser maior que 30 caracteres.')
      if len(kwargs.get('password')) > 30:
          raise Exception('Senha não pode ser maior que 30 caracteres.')

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

      # Validate field lengths
      if len(kwargs.get('username')) > 30:
        raise Exception('Nome de usuário não pode ser maior que 30 caracteres.')
      if len(kwargs.get('email')) > 30:
        raise Exception('Email não pode ser maior que 30 caracteres.')
      if kwargs.get('first_name') and len(kwargs.get('first_name')) > 30:
        raise Exception('Primeiro nome não pode ser maior que 30 caracteres.')
      if kwargs.get('last_name') and len(kwargs.get('last_name')) > 30:
        raise Exception('Último nome não pode ser maior que 30 caracteres.')
      if len(kwargs.get('password')) > 30:
        raise Exception('Senha não pode ser maior que 30 caracteres.')

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




