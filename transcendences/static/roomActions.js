import {displaySection, showSection} from './ui.js';

export function createRoom(event) {
    event.preventDefault();
    const route = '/game';
      // Declare roomName with const
    document.getElementById('room-name-display').textContent = document.getElementById('room-name').value;

    history.pushState({}, '', route);
    showSection(route, displaySection);  // Update UI based on route
}