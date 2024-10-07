import {updateNavBar} from "./auth.js";

export const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
};

// not being used for now
export const loadLoader = async (loader) => {
    try {
        const response = await fetch(`/static/views/${loader}.html`);
        if (response.ok) {
            const loaderHtml = await response.text();
            document.getElementById('content').innerHTML = loaderHtml;
        } else {
            console.error('Failed to load loader:', response.status);
        }
    } catch (error) {
        console.error('Error loading loader:', error);
    }
}

export const updateNavbarActiveLink = (currentRoute) => {
    const navbarButtons = document.querySelectorAll('.navbar-nav .nav-item a');

    navbarButtons.forEach(button => {
        if (button.dataset.route === currentRoute) {
            button.classList.remove('btn-dark');
            button.classList.add('btn-outline-light');
            button.setAttribute('aria-current', 'page');
        } else {
            button.classList.remove('btn-outline-light');
            button.classList.add('btn-dark');
            button.removeAttribute('aria-current');
        }
    });
}

export const checkAuthStatus = async () => {
    try {
        const response = await fetch('/api/check_auth/');
        if (response.ok) {
            updateNavBar(true);
        } else {
            updateNavBar(false);
        }
        return response.ok;
    } catch (e) {
        console.log('Error while checking the authentication status: ', e);
        updateNavBar(false);
        return false;
    }
}