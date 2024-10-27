import { displaySection } from "./ui.js";
import { getCookie } from "./utils.js";

export function attachFormSubmitListener() {
    const form = document.getElementById('local-tournament-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const data = {
            name: formData.get('tournamentName'),
            players: formData.getAll('player')
        };

        try {
            const response = await fetch('/api/create_tournament/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                const tournamentId = result.tournament_id;
                window.history.pushState({}, '', `/tournament?tournament_id=${tournamentId}`);
                displaySection(`/tournament?tournament_id=${tournamentId}`);
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Error creating tournament:', error);
            alert('An error occurred while creating the tournament.');
        }
    });

    const addPlayerButton = document.getElementById('addPlayer');
    const removePlayerButton = document.getElementById('removePlayer');

    addPlayerButton.addEventListener('click', () => {
        const playersContainer = document.getElementById('playerInputs');
        const playerInputs = playersContainer.querySelectorAll('input[name="player"]');
        if (playerInputs.length < 8) {
            const newPlayerInput = document.createElement('div');
            newPlayerInput.classList.add('mb-3');
            newPlayerInput.innerHTML = `
                <label class="form-label">Jogador ${playerInputs.length + 1}</label>
                <input type="text" class="form-control" name="player" required>
            `;
            playersContainer.appendChild(newPlayerInput);
            updateButtonStates();
        }
    });

    removePlayerButton.addEventListener('click', () => {
        const playersContainer = document.getElementById('playerInputs');
        const playerInputs = playersContainer.querySelectorAll('input[name="player"]');
        if (playerInputs.length > 4) {
            playersContainer.lastElementChild.remove();
            updateButtonStates();
        }
    });

    function updateButtonStates() {
        const playersContainer = document.getElementById('playerInputs');
        const playerInputs = playersContainer.querySelectorAll('input[name="player"]');
        addPlayerButton.disabled = playerInputs.length >= 8;
        removePlayerButton.disabled = playerInputs.length <= 4;
    }

    // Initial state update
    updateButtonStates();
}

export async function displayMatches(tournamentId) {
    try {
        const response = await fetch(`/api/tournament/${tournamentId}/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const content = document.getElementById('content');
        
        // Fetch the tournament view
        const viewResponse = await fetch('/static/views/tournament.html');
        if (!viewResponse.ok) {
            throw new Error(`HTTP error! status: ${viewResponse.status}`);
        }
        const viewHtml = await viewResponse.text();
        content.innerHTML = viewHtml;

        // Populate the view with matches data
        document.querySelector('#tournament h2').textContent = `Partidas ${data.name}`;
        const matchesList = document.querySelector('#tournament .list-group');
        matchesList.innerHTML = data.rounds.map((round, roundIndex) => `
            <div class="round">
                <h3>Round ${roundIndex + 1}</h3>
                <ul class="list-group">
                    ${round.map(match => `
                        <li class="list-group-item">
                            ${match.player2 == 'Bye' ? `${match.player1} gets a bye` :
                            (match.winner ? 
                            `<strong>${match.winner}</strong> defeated ${match.winner === match.player1 ? match.player2 : match.player1}` :
                            `${match.player1} vs ${match.player2}`)
                            }
                        </li>
                    `).join('')}
                </ul>
            </div>
        `).join('');

        // Show the content div
        content.style.display = 'block';

        // Add event listener to the start tournament button
        document.getElementById('startTournamentButton').addEventListener('click', () => startNextGame(tournamentId));
    } catch (error) {
        console.error('Error loading matches:', error);
        alert('An error occurred while fetching matches.');
    }
}

function startNextGame(tournamentId) {
    fetch(`/start_next_game/${tournamentId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            const currentMatch = data.match;
            const gameMode = 'tournament';
            const gameUrl = `/game-canva?mode=${gameMode}&tournament_id=${tournamentId}`;
            window.history.pushState({}, '', gameUrl);
            displaySection(gameUrl);
        }
    })
    .catch(error => {
        console.error('Error starting next game:', error);
    });
}

export function getCurrentMatch(tournamentId) {
    return fetch(`/api/tournament/${tournamentId}/`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            const rounds = data.rounds;
            for (let round of rounds) {
                for (let match of round) {
                    if (!match.winner) {
                        return match;
                    }
                }
            }
            throw new Error('No more matches available');
        })
        .catch(error => {
            console.error('Error fetching current match:', error);
            throw error;
        });
}