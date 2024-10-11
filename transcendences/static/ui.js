import {initGame} from "./game.js";
import { registerUser, loginUser, logoutUser } from './auth.js';
import { LocalMovementStrategy } from './local_game.js'
import { OnlineMovementStrategy } from './remote_game.js'
import {getCookie} from "./utils.js";

export const protectedRoutes = ['/profile', '/game', '/rooms', '/local-tournament', '/online-rooms', '/online-tournaments'];
let roomsSocket;

const redirectToLogin = () => {
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
    // console.log("load View route: ", route);
    if (protectedRoutes.includes(route)) {
        fetch('/api/check_auth/')
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

const localMatch = (e) => {
    e.preventDefault();
    let nickname1 = document.getElementById('nickname1').value;
    let nickname2 = document.getElementById('nickname2').value;
    console.log('nickname1:', nickname1);
    console.log('nickname2:', nickname2);
    window.history.pushState({}, '', `/game-canva?mode=local`);
    displaySection('/game-canva?mode=local');
};

const remoteMatch = (e) => {
    e.preventDefault();
    fetch('/api/create_room/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        credentials: 'include',
    })
    .then(response => {
        if (!response.ok) {
            console.error('Error creating room: ', response.status);
            return response.text().then(text => { throw new Error(text) });
        }
        return response.json();
    })
    .then(data => {
        const gameId = data.game_id;
        window.history.pushState({}, '', `/game-canva?mode=online&game_id=${gameId}`);
        displaySection(`/game-canva?mode=online&game_id=${gameId}`);
    })
    .catch(error => {
        console.error('Erro ao criar a sala: ', error);
    });
}

const displaySection = async (route) => {
    let section = route.startsWith('/') ? route.slice(1) : route;
    console.log("displaySection section: ", section);
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    let MovementStrategy;

    let gameMode = hasQueryString();
    let gameId = '';
    if (gameMode !== '') {
        section = window.location.pathname.slice(1);
        const params = new URLSearchParams(window.location.search);
        if (params.has('game_id')) {
            gameId = params.get('game_id');
        }
    }

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
        case 'online-rooms':
            document.getElementById('createRoomForm').addEventListener('submit', remoteMatch);
            connectRoomsWebSocket();
            break;
        case 'local-vs-friend':
            document.getElementById('players-nicknames').addEventListener('submit', localMatch);
            break;
        case 'game-canva':
            if (gameMode === 'online') {
                document.getElementById('room-name-display').textContent = `Sala ${gameId.substring(0, 8)}`;
                let websocket = initRemoteGame(gameId);
                MovementStrategy = new OnlineMovementStrategy(websocket);
            }
            else if (gameMode === 'local') {
                MovementStrategy = new LocalMovementStrategy();
            }
            initGame(MovementStrategy);
            break;
    }
}

function connectRoomsWebSocket() {
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsScheme}://${window.location.host}/ws/rooms/`;

    roomsSocket = new WebSocket(wsUrl);

    roomsSocket.onopen = function(event) {
        console.log('Connected to rooms WebSocket');
        fetchAvailableRooms();
    };

    roomsSocket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        handleRoomsUpdate(data);
    };

    roomsSocket.onclose = function(event) {
        console.log('Rooms WebSocket closed');
    };

    roomsSocket.onerror = function(error) {
        console.error('Rooms WebSocket error: ', error);
    };
}

function handleRoomsUpdate(data) {
    const action = data.action;
    const room = data.room;

    if (action === 'create') {
        addRoomToList(room);
    } else if (action === 'update') {
        if (room.players >= 2) {
            removeRoomFromList(room.game_id);
        } else {
            updateRoomInList(room);
        }
    } else if (action === 'delete') {
        removeRoomFromList(room.game_id);
    }
}

function addRoomToList(room) {
    const roomsList = document.getElementById('roomsList');
    const roomElement = createRoomElement(room);
    roomsList.appendChild(roomElement);
    document.getElementById('noRoomsMessage').classList.add('d-none');
    document.getElementById('create-rooms-button').classList.add('d-none');
}

function updateRoomInList(room) {
    const roomElement = document.getElementById(`room-${room.game_id}`);
    if (roomElement) {
        // Update the player count
        const small = roomElement.querySelector('small');
        small.textContent = `${room.players}/2 jogadores`;
    }
}

function removeRoomFromList(gameId) {
    const roomElement = document.getElementById(`room-${gameId}`);
    if (roomElement) {
        roomElement.remove();
    }
    // Check if rooms list is empty
    const roomsList = document.getElementById('roomsList');
    if (roomsList.children.length === 0) {
        document.getElementById('noRoomsMessage').classList.remove('d-none');
        document.getElementById('create-rooms-button').classList.remove('d-none');
    }
}

function createRoomElement(room) {
    const roomElement = document.createElement('a');
    roomElement.href = '#';
    roomElement.id = `room-${room.game_id}`;
    roomElement.classList.add('list-group-item', 'list-group-item-action');
    roomElement.addEventListener('click', () => {
        joinRoom(room.game_id);
    });

    const roomHeader = document.createElement('div');
    roomHeader.classList.add('d-flex', 'w-100', 'justify-content-between');

    const h5 = document.createElement('h5');
    h5.classList.add('mb-1');
    h5.textContent = `Sala ${room.game_id.substring(0, 8)}`;

    const small = document.createElement('small');
    small.textContent = `${room.players}/2 jogadores`;

    roomHeader.appendChild(h5);
    roomHeader.appendChild(small);

    const p = document.createElement('p');
    p.classList.add('mb-1');
    p.textContent = `Criado por: ${room.created_by}`;

    roomElement.appendChild(roomHeader);
    roomElement.appendChild(p);

    return roomElement;
}

function fetchAvailableRooms() {
    fetch('/api/get_available_rooms/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
        },
        cache: 'no-store',
        credentials: 'include',
    })
    .then(response => {
        if (!response.ok) {
            console.error('Error fetching rooms: ', response.status);
            return response.text().then(text => { throw new Error(text) });
        }
        return response.json();
    })
    .then(data => {
        console.log('API Response:', data);
        const rooms = data.rooms_list;
        const roomsList = document.getElementById('roomsList');
        roomsList.innerHTML = '';

        if (rooms.length === 0) {
            document.getElementById('noRoomsMessage').classList.remove('d-none');
            document.getElementById('create-rooms-button').classList.remove('d-none');
        } else {
            rooms.forEach(room => {
                addRoomToList(room);
            });
        }
    })
    .catch(error => {
        console.error('Erro ao obter salas disponíveis: ', error);
    });
}

function joinRoom(gameId) {
    fetch('/api/join_room/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        credentials: 'include',
        body: JSON.stringify({'game_id': gameId}),
    })
    .then(response => {
        if (!response.ok) {
            console.error('Error joining room: ', response.status);
            return response.text().then(text => { throw new Error(text) });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            window.history.pushState({}, '', `/game-canva?mode=online&game_id=${gameId}`);
            displaySection(`/game-canva?mode=online&game_id=${gameId}`);
        } else {
            alert(data.error);
            fetchAvailableRooms();
        }
    })
    .catch(error => {
        console.error('Erro ao entrar na sala: ', error);
    });
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
        redirectToLogin();
    }
}
