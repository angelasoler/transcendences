let canvas, context;
const canvasWidth = 600;
const canvasHeight = 400;

// Tamanhos
const paddleWidth = 10;
const paddleHeight = 100;
const ballRadius = 7;

// Posições iniciais
let paddle1Y = canvasHeight / 2 - 50;
let paddle2Y = canvasHeight / 2 - 50;
let ballX = canvasWidth / 2;
let ballY = canvasHeight / 2;

let upPressed = false;
let downPressed = false;

let waitOponent = true;
let playerPaddle = null;
let score = {
    player1: {
        name: '',
        score: 0
    },
    player2: {
        name: '',
        score: 0
    }
};

let animationFrameId;

////// GAME //////

function stopGame() {
    // Cancelar o loop de animação
    cancelAnimationFrame(animationFrameId);

    // Remover event listeners
    document.removeEventListener('keydown', keyDownHandler);
    document.removeEventListener('keyup', keyUpHandler);
}

function keyDownHandler(e) {
    if (e.key === 'ArrowUp') {
        upPressed = true;
    } else if (e.key === 'ArrowDown') {
        downPressed = true;
    }
}

function keyUpHandler(e) {
    if (e.key === 'ArrowUp') {
        upPressed = false;
    } else if (e.key === 'ArrowDown') {
        downPressed = false;
    }
}

function initGame() {
    // Configurações do canvas
    canvas = document.getElementById('gameCanvas');
    context = canvas.getContext('2d');

    // Adicionar event listeners para teclas
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);

}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar os paddles
    context.fillStyle = 'green';
    context.fillRect(0, paddle1Y, paddleWidth, paddleHeight);
    context.fillRect(canvasWidth - paddleWidth, paddle2Y, paddleWidth, paddleHeight);

    // Desenhar a bola
    context.beginPath();
    context.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    context.fill();

    // Desenhar a pontuação
    context.font = '24px Arial';
    context.fillStyle = 'white';
    context.fillText(`${score.player1.name}: ${score.player1.score}`, 50, 30);
    context.fillText(`${score.player2.name}: ${score.player2.score}`, canvasWidth - 150, 30);
}

function updatePaddlePositions() {
    if (playerPaddle === 'paddle1') {
        if (upPressed && paddle1Y > 0) {
            paddle1Y -= 5;
        }
        if (downPressed && paddle1Y < canvasHeight - 100) {
            paddle1Y += 5;
        }
    } else if (playerPaddle === 'paddle2') {
        if (upPressed && paddle2Y > 0) {
            paddle2Y -= 5;
        }
        if (downPressed && paddle2Y < canvasHeight - 100) {
            paddle2Y += 5;
        }
    }
    sendGameUpdate();
}

function gameLoop() {
    if (waitOponent) {
        context.font = 'bold 60px serif';
        context.strokeStyle = 'green';
        context.strokeText(`Wait`, canvasWidth/2 - 80, canvasHeight/2);
    }
    else {
        draw();
        updatePaddlePositions();
    }
    animationFrameId = requestAnimationFrame(gameLoop);
}

////// ROUTES //////

const protectedRoutes = ['/profile', '/game', '/rooms', '/rankings'];

function showSection(route) {
    if (protectedRoutes.includes(route)) {
        fetch('/api/check_auth/')
            .then(response => {
                if (response.ok) {
                    displaySection(route);
                } else {
                    history.pushState({}, '', '/login');
                    showSection('/login');
                }
            });
    } else {
        displaySection(route);
    }
}

let roomName;

function displaySection(route) {
    const sections = document.querySelectorAll('section');
    sections.forEach(section => section.style.display = 'none');
    const sectionId = route === '/' ? 'home' : route.slice(1);
    document.getElementById(sectionId).style.display = 'block';

    if (sectionId === 'game') {
        stopGame();
        initGame();
        connectWebSocket();
        gameLoop();
    }
    else if (sectionId == 'rankings')
        getRankings();
    else if (sectionId == 'profile')
        getProfile();
    else
        stopGame(); //provisorio
}

document.addEventListener('click', function(event) {
    const target = event.target;
    if (target.matches('a[data-route]')) {
        event.preventDefault(); //evita recarregamento de pagina
        const route = target.getAttribute('href');
        history.pushState({}, '', route); //atualiza a url sem recarregar a pagina
        showSection(route); //atualiza o conteudo exibido
    }
});

//detecta quando o usuário navega usando os botões de voltar ou avançar.
window.addEventListener('popstate', function() {
    const route = window.location.pathname;
    showSection(route);
});

//inicializa a seção correta ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    const route = window.location.pathname;
    showSection(route);
});

////// FETCH API /////

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

document.getElementById('registerForm').addEventListener('submit', registerUser);

//TO-DO RETIRAR EMAIL?
async function registerUser(event) {
    const csrftoken = getCookie('csrftoken');
    event.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    const response = await fetch('/api/register/', {
        method: 'POST',
        mode: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify({username, email, password}),
    });
    
    const result = await response.json();
    if (response.ok) {
        alert(result.message);
        history.pushState({}, '', '/login');
        showSection('/login');
    } else {
        alert(result.error);
    }
}

document.getElementById('loginForm').addEventListener('submit', loginUser);

async function loginUser(event) {
    const csrftoken = getCookie('csrftoken');
    event.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    const response = await fetch('/api/login/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify({username, password}),
    });

    const result = await response.json();
    if (response.ok) {
        alert(result.message);
        history.pushState({}, '', '/');
        showSection('/');
    } else {
        alert(result.error);
    }
}

async function getProfile() {
    const response = await fetch('/api/profile/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
        },
        cache: 'no-store',
    });
    if (response.ok) {
        const data = await response.json();
        document.getElementById('profileUsername').textContent = data.username;
        document.getElementById('profileEmail').textContent = data.email;
    } else {
        alert('Erro ao obter perfil do usuário.');
        history.pushState({}, '', '/login');
        showSection('/login');
    }
}

async function logout() {
    const csrftoken = getCookie('csrftoken');
    const response = await fetch('/api/logout/', {
        method: 'POST',
        mode: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
        },
    });

    const result = await response.json();
    if (response.ok) {
        alert(result.message);
        window.location.href = '/'; //is secure loging out like this? user poderia modifica isso?
    } else {
        alert(result.error);
    }
}

async function getRankings() {
    const response = await fetch('/api/rankings/');
    if (response.ok) {
        const data = await response.json();
        const tableBody = document.getElementById('rankingsTableBody'); // TO-DO
        tableBody.innerHTML = '';
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.position}</td>
                <td>${item.username}</td>
                <td>${item.points}</td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        alert('Erro ao obter rankings.');
    }
}

////// WebSocket /////

let gameSocket;

document.getElementById('room-form').addEventListener('submit', createRoom);

//TO-DO: selectRoom(event)
function createRoom(event) {
    event.preventDefault();
    const route = '/game';
    roomName = document.getElementById('room-name').value;
    document.getElementById('room-name-display').textContent = roomName;
    history.pushState({}, '', route);
    showSection(route);
}

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws/game/${roomName}/`;
    gameSocket = new WebSocket(wsUrl);

    if (!roomName) { //TO-DO: não permitir em form
        console.error("Nome da sala está vazio.");
        return;
    }

    gameSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        if (data.paddle) {
            playerPaddle = data.paddle;
            console.log("Você controla: " + playerPaddle);
        } else {
            const gameState = data.game_state;
            const serverScore = data.score;
            console.log("updateGameState");
            updateGameState(gameState, serverScore);
        }
    };

    gameSocket.onopen = function() {
        console.log("Conectado à sala " + roomName);
    };

    gameSocket.onclose = function() {
        console.log("Desconectado da sala " + roomName);
    };

    gameSocket.onerror = function(e) {
        console.error('Erro no WebSocket:', e);
    };
}

function sendGameUpdate() {
    const gameState = {
        paddle1Y: paddle1Y,
        paddle2Y: paddle2Y,
    };
    if (gameSocket && gameSocket.readyState === WebSocket.OPEN) {
        gameSocket.send(JSON.stringify(gameState));
    }
}

function updateGameState(gameState, serverScore) {
    waitOponent = false
    if (playerPaddle === 'paddle1') {
        paddle2Y = gameState.paddle2Y;
    } else if (playerPaddle === 'paddle2') {
        paddle1Y = gameState.paddle1Y;
    }
    ballX = gameState.ballX;
    ballY = gameState.ballY;
    score.player1.name = serverScore.player1.name;
    score.player1.score = serverScore.player1.score;
    score.player2.name = serverScore.player2.name;
    score.player2.score = serverScore.player2.score;
}

