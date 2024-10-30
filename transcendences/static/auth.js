import {getCookie} from './utils.js';
import {navigateTo} from "./routes.js";
import { redirectToLogin } from "./ui.js";

export const ImageToBase64  =  async () => {
    return new Promise((resolve, reject) => {
        const file    = document.getElementById('formFile').files[0];

        const reader  = new FileReader()
        
        reader.onload = () => {
            resolve(reader.result)
        }
        if (file) {
            reader.readAsDataURL(file)
        } else {
            resolve(undefined)
        }
    })
}


export const registerUser = async (event) => {
    event.preventDefault();
    const csrftoken    = getCookie('csrftoken');
    const username     = document.getElementById('registerUsername').value;
    const firstname    = document.getElementById('registerName').value;
    const lastname     = document.getElementById('registerLastName').value;
    const email        = document.getElementById('registerEmail').value;
    const password     = document.getElementById('registerPassword').value;
    const avatar       = await ImageToBase64()
    
    try {

        let verb = window.location.pathname.endsWith('update') ? 'PATCH' : 'POST'

        const response = await fetch('/api/user/create', {
            method: verb,
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken },
            body:  JSON.stringify({ username, email, password, firstname, lastname, avatar })
        });
        // if (!response.ok) {
        //     return response.text().then(text => { throw new Error(text) });
        // }
        const result = await response.json();
        if (response.ok) {
            alert(result.message);
            redirectToLogin();
            updateNavBar(false);
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

    const response = await fetch('/api/user/api/user/login', {
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
        const response = await fetch('/api/user/logout', {
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