import uuid
import base64
from django.core.files.base import ContentFile
from django.core.exceptions import ValidationError
from PIL import Image
import io

class UserService:

    @staticmethod
    def persist(data, file_name = "", dist = '/app/user/static/') -> str:
        extension = ""

        format, imgstr = data.split(';base64,')

        extension = format.split('/')[-1]

        if not extension:
            raise ValidationError('Formato de arquivo inválido')

        # Decode the base64 string
        decoded_data = base64.b64decode(imgstr)

        # Validate image type using Pillow
        try:
            image = Image.open(io.BytesIO(decoded_data))
            image_format = image.format.lower()
            if image_format not in ['jpeg', 'png']:
                raise ValidationError('Tipo de arquivo de avatar inválido. Apenas JPEG e PNG são permitidos.')
        except IOError:
            raise ValidationError('Arquivo de imagem inválido.')

        # Check the size of the decoded data (5MB limit)
        if len(decoded_data) > 5242880:  # 5MB in bytes
            raise ValidationError('Foto de perfil muito grande (máximo 5MB).')

        # Generate unique file name
        # Ensure the extension matches the image type
        if image_format == 'jpeg' and extension not in ['jpeg', 'jpg']:
            extension = 'jpeg'
        elif image_format == 'png' and extension != 'png':
            extension = 'png'

        #Convertendo de volta para bytes
        content = ContentFile(decoded_data, name=f'temp_image.{extension}')

        file_name = str(uuid.uuid4()) + file_name

        with open(dist + file_name, 'wb') as output:
            output.write(content.read())
        
        return  file_name

    @staticmethod
    def persistFile(data, file_name = "", dist = '/app/user/static/') -> str:
        file_name = str(uuid.uuid4()) + file_name

        with open(dist + file_name, 'wb') as output:
            output.write(data.read())
        
        return  file_name

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
            
