# Transcendences

**Transcendences** é uma aplicação web para jogar Pong, desenvolvida com foco em conectividade e acessibilidade. O projeto utiliza contêineres Docker e permite o acesso local e remoto, tornando-o facilmente acessível para diferentes ambientes.

## Como Executar

1. Para iniciar a aplicação, execute o seguinte comando:
    ```bash
    make
    ```

2. Acesse a aplicação:
   - **Local**: [http://0.0.0.0:8000/](http://0.0.0.0:8000/)
   - **Remoto**: [https://quality-grown-dassie.ngrok-free.app/](https://quality-grown-dassie.ngrok-free.app/)
  
## Funcionalidades Principais:

**Modos de Jogo:**

Single Game: Permite partidas individuais, tanto localmente quanto remotamente.

Torneios: Disponível no modo remoto, possibilita a organização de torneios entre múltiplos jogadores.

Inteligência Artificial (IA): Implementa uma IA para que os jogadores possam competir contra.

Remote: Permite jogar partidas com oponentes remotamente.

**Autenticação de Usuário:**

Registro e Login Convencionais: Usuários podem criar contas e acessar o jogo utilizando credenciais tradicionais.

OAuth com API da 42: Integração com a API da 42 para autenticação simplificada, permitindo que estudantes da instituição utilizem suas credenciais existentes.


## Tecnologias

- **JavaScript**, **BootStrap**, **DJango**, **PostgreSQL**
- **Docker** para contêineres e **Docker Compose**
- **ngrok** para tunelamento remoto

## Estrutura de Arquivos

- **Dockerfile**: Configuração do ambiente da aplicação
- **docker-compose.yml**: Configuração de serviços Docker
- **Makefile**: Executa os comando docker compose
- **requirements.txt**: Dependências Python

## Licença

Distribuído sob a licença MIT.


