import {initGame, stopGame, updateGameState} from "./game.js";
import {connectWebSocket} from "./websocket.js";

const protectedRoutes = ['/profile', '/game', '/rooms', '/rankings'];

const redirectToLogin = () => {
    history.pushState({}, '', '/login');
    showSection('/login', displaySection);
};

export const showSection = (route, displaySection) => {
    if (protectedRoutes.includes(route)) {
        fetch('/api/check_auth/')
            .then(response => response.ok ? displaySection(route) : redirectToLogin())
            .catch(() => console.log("catch"));
    } else {
        displaySection(route);
    }
};

export const displaySection = (route) => {
    document.querySelectorAll('section').forEach(section => section.style.display = 'none');
    const sectionId = route === '/' ? 'home' : route.slice(1);
    document.getElementById(sectionId).style.display = 'block';

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
    } else if (sectionId === 'rankings')
        getRankings();
    else if (sectionId === 'profile')
        getProfile();
    else
        stopGame(); //provisorio
};

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