import {getCookie} from './utils.js';
import {navigateTo} from "./routes.js";

export const registerUser = async (event) => {
    event.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch('/api/register/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            credentials: 'include',
            body: JSON.stringify({ username, email, password })
        });
        // if (!response.ok) {
        // return response.text().then(text => { throw new Error(text) });
        // }
        const result = await response.json();
        if (response.ok) {
            alert(result.message);
            navigateTo('/login');
        } else {
            alert(result.error);
        }
    } catch (error) {
        console.error("Registration failed", error);
    }
};

export const loginUser = async (event) => {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    const response = await fetch('/api/login/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    if (response.ok) {
        alert(result.message);
        navigateTo('/home');
        updateNavBar(true);
    } else {
        alert(result.error);
    }
};

export const logoutUser = async () => {
    const csrftoken = getCookie('csrftoken');
    try {
        const response = await fetch('/api/logout/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrftoken},
        });
        const result = await response.json();
        if (response.ok) {
            alert(result.message);
            navigateTo('/home');
            updateNavBar(false);
        } else {
            alert(result.error);
        }
    } catch(error) {
        console.error("Logout Failed: ", error);
    }
};

export const updateNavBar = (isLoggedIn) => {
    const unauthorizedNav = document.getElementById('unauthorizedNavBar');
    const authorizedNav = document.getElementById('authorizedNavBar');

    if (isLoggedIn) {
        authorizedNav.style.display = 'block';
        unauthorizedNav.style.display = 'none';
    } else {
        authorizedNav.style.display = 'none';
        unauthorizedNav.style.display = 'block';
    }
}