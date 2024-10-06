import {displaySection, loadView} from "./ui.js";
import {logoutUser} from "./auth.js";
import {checkAuthStatus, updateNavbarActiveLink} from "./utils.js";

export const navigateTo = async (route) => {
    if (window.location.pathname !== route) {
        const isAuthenticated = await checkAuthStatus();

        if (isAuthenticated && (route === '/login' || route === '/register')) {
            route = '/home'; // Redirect to home
        }

        window.history.pushState({}, '', route);
        handleRoute(route);
    }
}

// Function to handle routing and display the correct section
export const handleRoute = (route) => {
    // Navegar para a seção apropriada
    console.log("handleRoute: ", route);
    switch(route) {
        case '/':
            loadView('home', displaySection);
            break;
        case '/home':
            loadView('home', displaySection);
            break;
        case '/logout':
            logoutUser();
            loadView('home', displaySection);
            break;
        case '/login':
            loadView('login', displaySection);
            break;
        case '/register':
            loadView('register', displaySection);
            break;
        case '/local-tournament':
            loadView('local-tournament', displaySection);
            break;
        case '/online-rooms':
            loadView('online-rooms', displaySection);
            break;
        case '/online-tournament':
            loadView('online-tournament', displaySection);
            break;
        case 'local-vs-friend':
            alert('Iniciando jogo local...'); // Placeholder
            break;
        default:
            loadView('home', displaySection);
    }
    if (route === '/') {
        updateNavbarActiveLink('home');
    } else {
        updateNavbarActiveLink(route.slice(1));
    }
}