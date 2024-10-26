import { displaySection } from "./ui.js";
import { getCookie } from "./utils.js";

export function attachFormSubmitListener() {
    const form = document.getElementById('local-tournament-form');
    const addPlayerButton = document.getElementById('addPlayer');

    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const csrfToken = getCookie('csrftoken');
            const tournamentName = form.querySelector('#tournamentName').value;
            const players = Array.from(form.querySelectorAll('#playerInputs input')).map(input => input.value);

            console.log("Tournament Name:", tournamentName);
            console.log("Players:", players);

            // Shuffle players to randomize matchups
            players.sort(() => Math.random() - 0.5);

            // Add a "bye" if the number of players is odd
            if (players.length % 2 !== 0) {
                players.push('Bye');
            }

            const tournamentData = {
                name: tournamentName,
                players: players
            };

            console.log("Tournament Data:", tournamentData); // Log the data being sent

            try {
                const response = await fetch('/api/create_tournament/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken,
                    },
                    body: JSON.stringify(tournamentData)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Error:', errorText);
                    alert('An error occurred: ' + errorText);
                    return;
                }
                const data = await response.json();
                console.log('Tournament created successfully!');
                if (data.error) {
                    alert(data.error);
                } else {
                    alert('Tournament created successfully!');
                    displayMatchups(data.tournament_id);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An unexpected error occurred.');
            }
        });

        if (addPlayerButton) {
            addPlayerButton.addEventListener('click', function() {
                const playerInputs = document.getElementById('playerInputs');
                const playerCount = playerInputs.children.length + 1;
                const newPlayerDiv = document.createElement('div');
                newPlayerDiv.className = 'mb-3';
                newPlayerDiv.innerHTML = `
                    <label class="form-label">Jogador ${playerCount}</label>
                    <input type="text" class="form-control" name="player${playerCount}" required>
                `;
                playerInputs.appendChild(newPlayerDiv);
            });
        }
    }
}

export async function displayMatchups(tournamentId) {
    try {
        const response = await fetch(`/api/tournament_matchups/${tournamentId}/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const content = document.getElementById('content');
        content.innerHTML = `
            <h2>Matchups for ${data.name}</h2>
            <ul>
                ${data.matchups.map(matchup => `
                    <li>${matchup.player1} vs ${matchup.player2 || 'Bye'}</li>
                `).join('')}
            </ul>
            <button id="startNextGame" class="btn btn-primary">Start Next Game</button>
        `;
        document.getElementById('startNextGame').addEventListener('click', () => startNextGame(tournamentId));
    } catch (error) {
        console.error('Error loading matchups:', error);
        alert('An error occurred while fetching matchups.');
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
            const currentMatchup = data.matchup;
            const gameMode = 'tournament';
            const gameUrl = `/game-canva?$mode=${gameMode}&game_id=${tournamentId}`;
            window.history.pushState({}, '', gameUrl);
            displaySection(gameUrl);
        }
    })
    .catch(error => {
        console.error('Error starting next game:', error);
    });
}

function loadGameCanvaView(callback) {
    fetch('/static/views/game-canva.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('content').innerHTML = html;
            if (callback) callback();
        })
        .catch(error => {
            console.error('Error loading game-canva view:', error);
        });
}