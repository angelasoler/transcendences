from django.test                import TestCase

from .models                    import User

from django.contrib.auth.models import User as DjangoUser

from django.urls import reverse

from django.core.files.uploadedfile import SimpleUploadedFile


import base64

# Create your tests here.

class UserModelTest(TestCase):
    def setUp( self ) -> None:
        user        = DjangoUser.objects.create_user('Joao', 'teste@teste.com', 'johnpassword')
        friend      = DjangoUser.objects.create_user('pedro', 'teste@teste.com', 'johnpassword')
        self.manager   = User.objects.create(manager=user, avatar_path='teste')
        self.friend = User.objects.create(manager=friend, avatar_path='teste')

    def test_if_models_exists( self ) -> None:
        self.assertEqual(User.objects.count(), 2)

    def test_adding_friends( self ) -> None:
        self.manager.add_friend(self.friend)
        
        self.assertEqual(self.manager.friends.count(), 1)

    def test_if_friend_has_user_friend(self) -> None:
        self.manager.add_friend(self.friend)

        self.assertEqual(self.friend.friends.count(), 1)


class UserController(TestCase):
    def setUp(self) -> None:
        pass

    def test_create_client_worng_http_verb(self) -> None:
        response = self.client.get(reverse('create_user'), {'name': 'user', 'last_name': 'user_last_name', 'email': 'user@email.com'} )
        
        self.assertEqual(response.status_code, 404)

    def test_create_client(self) -> None:
        avatar   = SimpleUploadedFile("avatar.png", open('/app/user/fixtures/user_image.png', 'rb').read() , content_type="image/png")

        request = {
            'username': 'joao1', 
            'password': 'joao1', 
            'first_name': 'joao', 
            'last_name': 'user_last_name', 
            'email': 'user@email.com', 
            'avatar': avatar
        }

        response = self.client.post(reverse('create_user'), request, format='multipart' )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(User.objects.count(), 1)

    def test_user_login( self ) -> None:
        user    = User.create(
            first_name = 'joao', 
            last_name  = 'joaoLastName', 
            username   = 'joao1', 
            email      = 'teste@email.com', 
            password   = '1234', 
            avatar     = 'homer.png'
        )

        request = {
            'username': 'joao1',
            'password': '1234'
        }

        #login 
        response = self.client.post(reverse('login_user'), request, format='multipart' )
        
        #expect to return 200 http status code
        self.assertEqual(response.status_code, 200)


    def test_update_user( self ) -> None:
        avatar  = SimpleUploadedFile("avatar.png", open('/app/user/fixtures/user_image.png', 'rb').read() , content_type="image/png")

        user    = User.create(
            first_name = 'joao', 
            last_name  = 'joaoLastName', 
            username   = 'joao1', 
            email      = 'teste@email.com', 
            password   = '1234', 
            avatar     = 'teste'
        )

        request_login = {
            'username': 'joao1',
            'password': '1234'
        }

        request = {
            'id':   user.id,
            'username': 'jogador1', 
            'first_name': 'jogador1FirstName', 
            'last_name': 'jogador1_last_name', 
            'email': 'jogador1@email.com', 
            'avatar': avatar
        }

        # data before update

        self.assertEqual(User.objects.count(), 1)

        self.assertEqual(DjangoUser.objects.count(), 1)
        
        self.assertEqual(DjangoUser.objects.first().username,   'joao1')
        
        self.assertEqual(DjangoUser.objects.first().email,      'teste@email.com')
        
        self.assertEqual(DjangoUser.objects.first().last_name,   'joaoLastName')
        
        self.assertEqual(DjangoUser.objects.first().first_name, 'joao')

        #login 
        response_login = self.client.post(reverse('login_user'), request_login, format='multipart' )
        #updating
        response = self.client.post(reverse('update_user'), request, format='multipart' )

        #expect to return 200 http status code
        self.assertEqual(response.status_code, 200)

        #expect to return 200 http status code
        self.assertEqual(response.status_code, 200)

        #expect to not create a new user 
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(DjangoUser.objects.count(), 1)

        #expect to update attributes
        self.assertEqual(DjangoUser.objects.first().username,   'jogador1')
        self.assertEqual(DjangoUser.objects.first().first_name, 'jogador1FirstName')
        self.assertEqual(DjangoUser.objects.first().last_name,  'jogador1_last_name')
        self.assertEqual(DjangoUser.objects.first().email,      'jogador1@email.com')


    def test_adding_friends( self ) -> None:
        user    = User.create(
            first_name = 'joao', 
            last_name  = 'joaoLastName', 
            username   = 'joao', 
            email      = 'teste@email.com', 
            password   = '1234', 
            avatar     = 'teste'
        )

        friend1    = User.create(
            first_name = 'joao1', 
            last_name  = 'joaoLastName1', 
            username   = 'joao1', 
            email      = 'teste@email.com', 
            password   = '1234', 
            avatar     = 'teste'
        )

        friend2    = User.create(
            first_name = 'joao2', 
            last_name  = 'joaoLastName2', 
            username   = 'joao2', 
            email      = 'teste@email.com', 
            password   = '1234', 
            avatar     = 'teste'
        )

        request = {
            'username': 'joao',
            'password': '1234'
        }

        #login 
        response = self.client.post(reverse('login_user'), request, format='multipart' )


        request = {
            'newFriends': [ friend1.id, friend2.id ]
        }
        #adding friends
        response = self.client.post(reverse('user_add_friend'), request, format='multipart' )
       
        #expect to return 200 http status code
        self.assertEqual(response.status_code, 200)
        
        #expect to add 2 friends
        self.assertEqual(user.friends.count(), 2)
