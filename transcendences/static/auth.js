import { getCookie } from './utils.js';
import { showSection, displaySection } from "./ui.js";

export const registerUser = async (event) => {
    event.preventDefault();
    const csrftoken = getCookie('csrftoken');
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch('/api/register/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken },
            body: JSON.stringify({ username, email, password })
        });

        const result = await response.json();
        if (response.ok) {
            alert(result.message);
            history.pushState({}, '', '/login');
            showSection('/login', displaySection);
        } else {
            alert(result.error);
        }
    } catch (error) {
        console.error("Registration failed", error);
    }
};

export const loginUser = async (event) => {
    event.preventDefault();
    const csrftoken = getCookie('csrftoken');
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/login/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();
        if (response.ok) {
            alert(result.message);
            history.pushState({}, '', '/');
            showSection('/', displaySection);
        } else {
            alert(result.error);
        }
    } catch (error) {
        console.error("Login failed", error);
    }
};