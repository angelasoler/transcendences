import { initGame, gameLoop, stopGame } from './game.js';
import { connectWebSocket } from './websocket.js';
import { loadView, displaySection } from './ui.js';
import {createRoom} from "./roomActions.js";
import {logoutUser} from "./auth.js";
import {updateNavbarActiveLink, checkAuthStatus} from "./utils.js";
import {navigateTo, handleRoute} from "./routes.js";

document.addEventListener('DOMContentLoaded', async () => {
    // Initial authentication check when the page loads
    const isAuthenticated = await checkAuthStatus();

    const currentPath = window.location.pathname;
    // Load the initial route, handling redirects if needed
    if (isAuthenticated) {
        if (window.location.pathname === '/login' || window.location.pathname === '/register') {
            // Redirect logged-in users away from login/register page
            window.history.pushState({}, '', '/home');
            handleRoute('/home');
        } else {
            // Redirect logged-in users away from login/register page
            window.history.pushState({}, '', currentPath);
            handleRoute(currentPath);
        }
    }  else {
        // Redirect logged-in users away from login/register page
        window.history.pushState({}, '', currentPath);
        handleRoute(currentPath);
    }

    // Loads the correct outlined button
    const currentRoute = window.location.pathname;
    if (currentRoute === '/') {
        updateNavbarActiveLink('home');
    } else {
        updateNavbarActiveLink(currentRoute.slice(1));
    }

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