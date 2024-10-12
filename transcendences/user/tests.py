from django.test                import TestCase
from .models                    import User
from django.contrib.auth.models import User as DjangoUser
# Create your tests here.

class UserModelTest(TestCase):
    def setUp( self ) -> None:
        user        = DjangoUser.objects.create_user('Joao', 'teste@teste.com', 'johnpassword')
        friend      = DjangoUser.objects.create_user('pedro', 'teste@teste.com', 'johnpassword')
        self.user   = User.objects.create(user=user, avatar_path='teste')
        self.friend = User.objects.create(user=friend, avatar_path='teste')

    def test_if_models_exists( self ) -> None:
        self.assertEqual(User.objects.count(), 2)

    def test_adding_friends( self ) -> None:
        self.user.add_friend(self.friend)
        
        self.assertEqual(self.user.friends.count(), 1)

    def test_if_friend_has_user_friend(self) -> None:
        self.user.add_friend(self.friend)

        self.assertEqual(self.friend.friends.count(), 1)