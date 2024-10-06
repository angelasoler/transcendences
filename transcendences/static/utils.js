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

export const updateNavbarActiveLink = (currentRoute) => {
    // Select all buttons in the navbar
    const navbarButtons = document.querySelectorAll('.navbar-nav .nav-item a');

    // Iterate over each button
    navbarButtons.forEach(button => {
        // Check if the button's data-route matches the current route
        if (button.dataset.route === currentRoute) {
            button.classList.remove('btn-dark');
            button.classList.add('btn-outline-light'); // Active button style
            button.setAttribute('aria-current', 'page');
        } else {
            button.classList.remove('btn-outline-light');
            button.classList.add('btn-dark'); // Inactive buttons style
            button.removeAttribute('aria-current');
        }
    });
}

// Function to check if the user is already logged in so we can show the correct NavBar
export const checkAuthStatus = async () => {
    try {
        const response = await fetch('/api/check_auth/');
        if (response.ok) {
            updateNavBar(true);
        } else {
            updateNavBar(false);
        }
    } catch (e) {
        console.log('Error while checking the authentication status: ', e);
        updateNavBar(false);
    }
}