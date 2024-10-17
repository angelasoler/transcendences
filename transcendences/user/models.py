from django.db import models
from django.db import transaction

from django.contrib.auth.models import User as DjangoUser

from .service import UserService


#Garantindo que os emails sejam unicos
DjangoUser._meta.get_field('email')._unique    = True

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
      id          = kwargs.get('id')
      username    = kwargs.get('username')
      first_name  = kwargs.get('first_name')
      last_name   = kwargs.get('last_name')
      email       = kwargs.get('email')
      avatar      = kwargs.get('avatar')


      user = User.objects.get(pk = id)
      
      if (user is None):
        raise 'user com o id: {} não encontrado'.format(id)
      
      user.manager.username    = username                     if username   is not None else user.manager.username
      user.manager.first_name  = first_name                   if first_name is not None else user.manager.first_name
      user.manager.last_name   = last_name                    if last_name  is not None else user.manager.last_name
      user.manager.email       = email                        if email      is not None else user.manager.email
      user.avatar_path         = UserService.persist(avatar.file, avatar.name)  if avatar is not None else user.avatar_path

      user.manager.save()
      user.save()

      return user


# Create your models here.




