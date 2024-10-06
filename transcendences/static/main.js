import { initGame, gameLoop, stopGame } from './game.js';
import { connectWebSocket } from './websocket.js';
import { showSection, displaySection } from './ui.js';
import { registerUser, loginUser } from './auth.js';
import {createRoom} from "./roomActions.js";

document.addEventListener('DOMContentLoaded', () => {
    // Load the initial route
    handleRoute(window.location.pathname);

    // Event listener for form submissions
    document.getElementById('registerForm').addEventListener('submit', registerUser);
    document.getElementById('loginForm').addEventListener('submit', loginUser);
    document.getElementById('room-form').addEventListener('submit', createRoom);

    // Event listener for route changes (links with data-route)
    document.addEventListener('click', (event) => {
        const link = event.target.closest('a[data-route]'); // Find closest link with data-route
        if (link) {
            event.preventDefault(); // Prevent default link behavior (page reload)
            const path = link.getAttribute('href');
            window.history.pushState({}, '', path); // Change the URL without reloading
            handleRoute(path); // Load the correct section
        }
    });

    // Handle back/forward browser buttons
    window.addEventListener('popstate', () => {
        handleRoute(window.location.pathname);
    });
});

// Function to handle routing and display the correct section
function handleRoute(route) {
    showSection(route, displaySection);
}