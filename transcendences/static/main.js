import {updateNavbarActiveLink, checkAuthStatus, closeModal, getCookie} from "./utils.js";
import {navigateTo, handleRoute} from "./routes.js";
import "./local_game.js";

async function handleAuthRouting() {
    const isAuthenticated = await checkAuthStatus();
    const currentRoute = window.location.pathname;

    if (isAuthenticated) {
        if (currentRoute === '/login' || currentRoute === '/register') {
            window.history.pushState({}, '', '/home');
            handleRoute('/home');
            return;
        }
    }
    window.history.pushState({}, '', currentRoute);
    handleRoute(currentRoute);
}

document.addEventListener('DOMContentLoaded', async () => {
    handleAuthRouting();

    const currentRoute = window.location.pathname;
    if (currentRoute === '/') {
        updateNavbarActiveLink('home');
    } else {
        updateNavbarActiveLink(currentRoute.slice(1));
    }

    document.addEventListener('click', (e) => {
        const route = e.target.getAttribute('data-route');
        if (route) {
            e.preventDefault();
            closeModal();
            navigateTo(`/${route}`);
        }
    });

    window.addEventListener('popstate', () => {
        handleRoute(window.location.pathname);
    });

    window.addEventListener('beforeunload', () => {
        fetch('/api/user/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        }).catch((error) => {
            console.error('Error logging out:', error);
        });
    });
});