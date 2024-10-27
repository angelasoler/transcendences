import { initGame } from "./game.js";
import { registerUser, loginUser, logoutUser } from './auth.js';
import { LocalMovementStrategy } from './local_game.js'
import { OnlineMovementStrategy } from './remote_game.js'
import { closeModal, getCookie } from "./utils.js";
import { AIMovementStrategy } from './ai_game.js'
import { TournamentGame } from "./tournament_game.js";
import { ProfileStats } from './profile_stats.js';
import { attachFormSubmitListener, getCurrentMatch, displayMatches } from "./tournament.js";

export const protectedRoutes = ['/profile', '/game', '/rooms', '/local-tournament', '/online-rooms', '/online-tournament'];
let roomsSocket;

export const redirectToLogin = () => {
    window.history.pushState({}, '', '/login');
    displaySection('/login');
};

function hasQueryString() {
    const queryString = window.location.search;
    const hasQueryString = queryString !== '';
    let modeValue = '';

    if (hasQueryString) {
        const queryParams = queryString.substring(1);
        const paramsArray = queryParams.split('&');

        paramsArray.forEach(param => {
            const [key, value] = param.split('=');
            if (key === 'mode') {
                modeValue = value;
            }
        });
    }
    return modeValue;
}

export const loadView = (route) => {
    console.log("load View route: ", route);
    if (protectedRoutes.includes(route)) {
        fetch('/api/user/check_auth')
            .then(response => {
                if (!response.ok)
                    redirectToLogin();
            }).catch(error => {
                console.error('check auth request to back end fail', error.message);
            });
    }
    try {
        displaySection(route);
    }
    catch (error) {
        console.error('Erro ao carregar a view:', error);
    }
};

const createLocalRoom = (e) => {
    e.preventDefault();
    let nickname1 = document.getElementById('nickname1').value;
    let nickname2 = document.getElementById('nickname2').value;
    console.log('nickname1:', nickname1);
    console.log('nickname2:', nickname2);
    window.history.pushState({}, '', `/game-canva?mode=local`);
    displaySection('/game-canva?mode=local');
};

const joinOrCreateRemoteRoom = (e) => {
    e.preventDefault();
    fetch('/api/join_or_create_room/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        credentials: 'include',
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                // Unauthorized, need to redirect to login
                throw new Error('Unauthorized');
            } else if (response.status === 403) {
                // Forbidden, need to redirect to login
                throw new Error('Forbidden');
            } else {
                console.error('Erro ao criar ou dar fetch na sala: ', response.status);
                return response.text().then(text => { throw new Error(text) });
            }
        }
        // Attempt to parse JSON
        return response.json().catch(() => {
            throw new Error('Invalid JSON response');
        });
    })
    .then(data => {
        if (data.game_id) {
            window.history.pushState({}, '', `/game-canva?mode=online&game_id=${data.game_id}`);
            displaySection(`/game-canva?mode=online&game_id=${data.game_id}`);
        } else {
            alert(data.error);
        }
    })
    .catch(error => {
        if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
            redirectToLogin();
        } else {
            console.error('Erro ao criar a sala: ', error);
            return response.text().then(text => { throw new Error(text) });
        }
    });
}

export const displaySection = async (route) => {
    // chama closeGame() se estiver dentro de um jogo e mudar de view
    if (window.currentMovementStrategy) {
        window.currentMovementStrategy.closeGame();
        window.currentMovementStrategy = null;
    }

    let section = route.startsWith('/') ? route.slice(1) : route;
    console.log("displaySection section: ", section);
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    let MovementStrategy;
    closeModal();

    let gameMode = hasQueryString();
    let gameId = '';
    if (gameMode !== '') {
        section = window.location.pathname.slice(1);
        const params = new URLSearchParams(window.location.search);
        if (params.has('game_id')) {
            gameId = params.get('game_id');
        }
    }
    section = section.split('?')[0];

    if (window.roomsInterval) {
        clearInterval(window.roomsInterval);
        window.roomsInterval = null;
    }

    if (roomsSocket) {
        roomsSocket.close();
        roomsSocket = null;
    }

    await fetchViews(section);
    switch (section) {
        case 'login':
            document.getElementById('loginForm').addEventListener('submit', loginUser);
            break;
        case 'register':
            document.getElementById('registerForm').addEventListener('submit', registerUser);
            break;
        case 'logout':
            logoutUser();
            break;
        case 'profile':
            getProfile();
            break;
        case 'show-stats':
            const stats = new ProfileStats();
            stats.loadStatistics();
            break;
        case 'home':
            document.getElementById('joinOnlineRoomButton').addEventListener('click', joinOrCreateRemoteRoom);
            break;
        case 'local-vs-friend':
            document.getElementById('players-nicknames').addEventListener('submit', createLocalRoom);
            break;
        case 'game-canva':
            if (gameMode === 'online') {
                document.getElementById('room-name-display').textContent = `Sala ${gameId.substring(0, 8)}`;
                let websocket = initRemoteGame(gameId);
                MovementStrategy = new OnlineMovementStrategy(websocket);
            } else if (gameMode === 'local') {
                MovementStrategy = new LocalMovementStrategy();
            } else if (gameMode === 'ia') {
                MovementStrategy = new AIMovementStrategy();
            } else if (gameMode === 'tournament') {
                const tournamentId = getTournamentId();
                getCurrentMatch(tournamentId).then(currentMatch => {
                    MovementStrategy = new TournamentGame(tournamentId, currentMatch);
                    initGame(MovementStrategy);
                }).catch(error => {
                    console.error('Error initializing tournament game:', error);
                });
                return;
            }
            initGame(MovementStrategy);
            break;
        case 'local-tournament':
            attachFormSubmitListener();
            break;  
        case 'tournament':
            const tournamentId = getTournamentId();
            displayMatches(tournamentId);
            break;
    }
}

function getTournamentId() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('tournament_id')) {
        return params.get('tournament_id');
    }
}

function initRemoteGame(gameId) {
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsScheme}://${window.location.host}/ws/pong/${gameId}/`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = (event) => {
        console.log('Conectado ao jogo', gameId);
    };
    return websocket;
}

async function fetchViews(sectionId) {
    let response;

    try {
        switch (sectionId) {
            case 'login':
            case 'register':
                response = await fetch(`/${sectionId}/`);
                break;
            default:
                response = await fetch(`/static/views/${sectionId}.html`);
        }
        if (response.ok) {
            const partialHtml = await response.text();
            document.getElementById('content').innerHTML = partialHtml;
        } else {
            console.error('Falha ao carregar view: ', response.status);
        }
    } catch (error) {
        console.error('Erro ao carregar view:', error);
    }
}

async function getProfile() {
    const response = await fetch('/api/user/profile', {
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
        document.getElementById('profilePic').setAttribute('src', `data:image/${data.extension};base64,`+ data.photo);
    } else {
        alert('Erro ao obter perfil do usuário.');
        redirectToLogin();
    }
}

export function showModal(gameMode, winner, tournamentId) {
    const displayWinnerMessageModal = new bootstrap.Modal(document.getElementById('displayWinnerMessageModal'), {
        backdrop: 'static',
        keyboard: false
    });

    updateModalContentForTournament(winner, tournamentId);

    const modalElement = document.getElementById('displayWinnerMessageModal');
    modalElement.addEventListener('hidden.bs.modal', () => {
        window.history.pushState({}, '', `/tournament?tournament_id=${tournamentId}`);
    }, { once: true }); // Ensure the event listener is called only once

    displayWinnerMessageModal.show();
}

function updateModalContentForTournament(winner, tournamentId) {
    const resultMessage = document.getElementById('resultMessage');
    const gameMessage = document.getElementById('game-message');
    const playAgainButton = document.getElementById('playAgainButton');
    const returnToHomeButton = document.getElementById('returnToHome');

    resultMessage.textContent = 'Resultado';
    gameMessage.textContent = `Vencedor: ${winner}`;
    playAgainButton.textContent = 'Voltar ao torneio';
 
    playAgainButton.onclick = () => {
        const modalElement = document.getElementById('displayWinnerMessageModal');
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        modalInstance.hide();
        window.history.pushState({}, '', `/tournament?tournament_id=${tournamentId}`);
        displaySection(`/tournament?tournament_id=${tournamentId}`);
    };
    returnToHomeButton.style.display = 'none';
}
