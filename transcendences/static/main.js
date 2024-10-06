import { initGame, gameLoop, stopGame } from './game.js';
import { connectWebSocket } from './websocket.js';
import { loadView, displaySection } from './ui.js';
import {createRoom} from "./roomActions.js";
import {logoutUser} from "./auth.js";
import {updateNavbarActiveLink, checkAuthStatus} from "./utils.js";
import {navigateTo, handleRoute} from "./routes.js";

document.addEventListener('DOMContentLoaded', () => {
    // Load the initial route
    handleRoute(window.location.pathname);
    // Loads the correct outlined button
    const currentRoute = window.location.pathname;
    if (currentRoute === '/') {
        updateNavbarActiveLink('home');
    } else {
        updateNavbarActiveLink(currentRoute.slice(1));
    }
    // Checks for if the user is logged in so we can load the correct NavBar
    checkAuthStatus();

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
            navigateTo(`/${route}`); // Load the correct section
        }
    });

    // Handle back/forward browser buttons
    window.addEventListener('popstate', () => {
        handleRoute(window.location.pathname);
    });
});