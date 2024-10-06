import {initGame, stopGame, updateGameState} from "./game.js";
import {connectWebSocket} from "./websocket.js";
import { registerUser, loginUser } from './auth.js';

const protectedRoutes = ['/profile', '/game', '/rooms', '/local_tournament', 'online_rooms', 'online_tournaments'];

const redirectToLogin = () => {
    loadView('login', displaySection);
};

export const loadView = (route, displaySection) => {
    if (protectedRoutes.includes(route)) {
        fetch('/api/check_auth/')
            .then(response => response.ok ? displaySection(route) : redirectToLogin())
            .catch(() => redirectToLogin());
    } else {
        displaySection(route);
    }
};

export const displaySection = (route) => {
    console.log("displaySection Route: ", route);
    const sectionId = route === '/' ? 'home' : route;
    console.log("section ID: ", sectionId);
    if (sectionId === 'login' || sectionId === 'register') {
        fetchDynamicAuth(sectionId);
    } else {
        fetchStaticViews(sectionId, route)
    }

    // document.getElementById(sectionId).style.display = 'block';
    if (sectionId === 'game') {
        let roomName = document.getElementById('room-name').value;
        let canvas = document.getElementById('gameCanvas');
        let context = canvas.getContext('2d');
        if (!roomName) {
            console.log("NO ROOM NAME");
            return;
        }
        // Call functions to stop previous game, init new game, etc.
        stopGame();
        initGame(canvas, context);
        connectWebSocket(roomName, updateGameState);
    } else if (sectionId === 'profile')
        getProfile();
    else
        stopGame(); //provisorio
}

async function fetchDynamicAuth(sectionId) {
    try {
        const response = await fetch(`/${sectionId}/`);
        if (response.ok) {
            const partialHtml = await response.text();
            document.getElementById('content').innerHTML = partialHtml;
            console.log("PUSH STATE CALLED!!!!");
            if (sectionId === 'login') {
                document.getElementById('loginForm').addEventListener('submit', loginUser);
            } else {
                document.getElementById('registerForm').addEventListener('submit', registerUser);
            }
        } else {
            console.error('Falha ao renderizar view: ', response.status);
        }
    } catch (error) {
        console.error('Erro ao renderizar view:', error);
    }
}

async function fetchStaticViews(sectionId, route) {
    try {
        const response = await fetch(`/static/views/${sectionId}.html`);
        if (response.ok) {
            const partialHtml = await response.text();
            document.getElementById('content').innerHTML = partialHtml;
            console.log("PUSH STATE CALLED!!!!");
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
        loadView('login', displaySection);
    }
}