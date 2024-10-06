import { initGame, gameLoop, stopGame } from './game.js';
import { connectWebSocket } from './websocket.js';
import { loadView, displaySection } from './ui.js';
import {createRoom} from "./roomActions.js";

document.addEventListener('DOMContentLoaded', () => {
    // Load the initial route
    handleRoute(window.location.pathname);
    // Todas as seções
    const sections = {
        home: document.getElementById('home'),
        localTournament: document.getElementById('local-tournament'),
        onlineRooms: document.getElementById('online-rooms'),
        onlineTournaments: document.getElementById('online-tournaments')
    };

    // Event listener for form submissions

    // document.getElementById('room-form').addEventListener('submit', createRoom);

    // Event listener for route changes (links with data-route)
    document.addEventListener('click', (e) => {
        const route = e.target.getAttribute('data-route');
        if (route) {
            e.preventDefault(); // Prevent default link behavior (page reload)
            // Fechar qualquer modal aberto
            const openModals = document.querySelectorAll('.modal');
            openModals.forEach(modal => {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                modalInstance?.hide();
            });
            handleRoute(route); // Load the correct section
        }
    });

    // Handle back/forward browser buttons
    window.addEventListener('popstate', () => {
        handleRoute(window.location.pathname);
    });
});

// Function to handle routing and display the correct section
function handleRoute(route) {
    // Navegar para a seção apropriada
    console.log("handleRoute: ", route);
    switch(route) {
        case 'home':
            loadView('home', displaySection);
            break;
        case 'login':
            loadView('login', displaySection);
            break;
        case 'register':
            loadView('register', displaySection);
            break;
        case 'local-tournament':
            loadView('local_tournament', displaySection);
            break;
        case 'join-room':
            loadView('online_rooms', displaySection);
            break;
        case 'online-tournament':
            loadView('online_tournaments', displaySection);
            break;
        case 'local-vs-friend':
            alert('Iniciando jogo local...'); // Placeholder
            break;
        default:
            loadView('home', displaySection);
    }
}