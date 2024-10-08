import {initGame, stopGame, OnlineMovementStrategy} from "./game.js";
import { registerUser, loginUser, logoutUser } from './auth.js';

export let roomName = null;

const protectedRoutes = ['/profile', '/game', '/rooms', '/local-tournament', '/online-rooms', '/online-tournaments'];

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

export const displaySection = async (route) => {
    let section = route.startsWith('/') ? route.slice(1) : route;
    console.log("displaySection section: ", section);
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    let MovementStrategy;

    let gameMode = hasQueryString();
    if (gameMode !== '') {
        section = window.location.pathname.slice(1);
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
            document.getElementById('createRoomForm').addEventListener('submit', (e) => {
                e.preventDefault();
                roomName = document.getElementById('roomName').value;
                console.log('roomName:', roomName);
                window.history.pushState({}, '', `/game-canva?mode=online`);
                displaySection('/game-canva?mode=online');
            });
            break;
        case 'game-canva':
            if (gameMode === 'online') {
                document.getElementById('room-name-display').textContent = roomName;
                MovementStrategy = new OnlineMovementStrategy(roomName);
            }
            // else if (gameMode === 'local') {
            //         MovementStrategy = new LocalMovementStrategy();
            // }
            initGame(MovementStrategy);
            stopGame(MovementStrategy);
            break;
    }
}

async function fetchViews(sectionId) {
    let response;

    switch (sectionId) {
        case 'login':
        case 'register':
            response = await fetch(`/${sectionId}/`);
            break;
        default:
            response = await fetch(`/static/views/${sectionId}.html`);
    }
    try {
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