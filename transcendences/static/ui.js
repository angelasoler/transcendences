import {initGame, stopGame, updateGameState, draw} from "./game.js";
import {connectWebSocket} from "./websocket.js";
import { registerUser, loginUser, logoutUser } from './auth.js';
export { fetchViews };

const protectedRoutes = ['profile', 'game', 'rooms', 'local-tournament', 'online-rooms', 'online-tournaments'];

const redirectToLogin = () => {
    loadView('login');
};

export const loadView = (route) => {
    console.log("load View route: ", route);
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

export const displaySection = async (section) => {
    console.log("displaySection section: ", section);
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');

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
        case 'game':
        case 'local-game':
            stopGame();
            initGame();
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
        loadView('login');
    }
}