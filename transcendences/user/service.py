import uuid

class UserService:

    @staticmethod
    def persist(data, file_name, dist = '/app/user/static/') -> str:
        file_name = str(uuid.uuid4()) + file_name

        with open(dist + file_name, 'wb') as output:
            output.write(data.read());
        
        return  file_name;