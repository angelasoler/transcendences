import {loadView} from "./ui.js";
import {checkAuthStatus, updateNavbarActiveLink} from "./utils.js";

export const navigateTo = async (route) => {
    if (window.location.pathname !== route) {
        const isAuthenticated = await checkAuthStatus();

        if (isAuthenticated && (route === '/login' || route === '/register')) {
            route = '/home';
        }

        window.history.pushState({}, '', route);
        handleRoute(route);
    }
}

export const handleRoute = (route) => {
    console.log("handleRoute: ", route);
    let routeRequested;
    if (route === '/') {
        routeRequested = 'home';
    } else {
        routeRequested = route.slice(1);
    }
    loadView(routeRequested);
    updateNavbarActiveLink(routeRequested);
}