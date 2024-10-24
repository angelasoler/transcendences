import uuid
import base64
from django.core.files.base import ContentFile

from io import BytesIO

class UserService:

    @staticmethod
    def persist(data, file_name = "", dist = '/app/user/static/') -> str:
        extension = ""

        format, imgstr = data.split(';base64,')

        extension = format.split('/')[-1]

        if extension == "":
            raise('Formato de arquivo inválido')
        
        #Convertendo de volta para bytes
        content = ContentFile(base64.b64decode(imgstr), name=f'temp_image.{extension}') 

        file_name = str(uuid.uuid4()) + file_name

        with open(dist + file_name, 'wb') as output:
            output.write(content.read());
        
        return  file_name;

    @staticmethod
    def persistFile(data, file_name = "", dist = '/app/user/static/') -> str:
        file_name = str(uuid.uuid4()) + file_name

        with open(dist + file_name, 'wb') as output:
            output.write(data.read());
        
        return  file_name;

    @staticmethod
    def restore(user, dist = '/app/user/static/'):
        try:
            with open(dist + user.profile.avatar_path, 'rb') as file:
                content = file.read()
                return base64.b64encode(content).decode('utf-8')
        except Exception as error:
            with open(dist + 'homer.png', 'rb') as file:
                content = file.read()
                return base64.b64encode(content).decode('utf-8')
            
