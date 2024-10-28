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
        const playersToAdd = Math.min(4, 8 - playerInputs.length);

        for (let i = 0; i < playersToAdd; i++) {
            const newPlayerInput = document.createElement('div');
            newPlayerInput.classList.add('mb-3');

            const label = document.createElement('label');
            label.classList.add('form-label');
            label.textContent = `Jogador ${playerInputs.length + i + 1}`;

            const input = document.createElement('input');
            input.type = 'text';
            input.classList.add('form-control');
            input.name = 'player';
            input.required = true;

            newPlayerInput.appendChild(label);
            newPlayerInput.appendChild(input);
            playersContainer.appendChild(newPlayerInput);
        }
        updateButtonStates();
    });

    removePlayerButton.addEventListener('click', () => {
        const playersContainer = document.getElementById('playerInputs');
        const playerInputs = playersContainer.querySelectorAll('input[name="player"]');
        const playersToRemove = Math.min(4, playerInputs.length - 4); // Remove up to 4 players, but not less than 4 total

        for (let i = 0; i < playersToRemove; i++) {
            playersContainer.lastElementChild.remove();
        }
        updateButtonStates();
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

        // Center the content
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.alignItems = 'center';

        // Populate the view with matches data
        document.querySelector('#tournament h2').textContent = `Partidas ${data.name}`;
        const matchesList = document.querySelector('#tournament .list-group');
        matchesList.innerHTML = ''; // Clear existing content

        // Check if the tournament has a winner
        if (data.winner) {
            const winnerDiv = document.createElement('div');
            winnerDiv.classList.add('winner');
            winnerDiv.innerHTML = `<h2>Campeão: ${data.winner}</h2>`;
            winnerDiv.style.textAlign = 'center'; // Center the winner text
            matchesList.appendChild(winnerDiv);
            document.getElementById('startTournamentButton').style.display = 'none';
            document.getElementById('returnHomeButton').style.display = 'inline-block';
            document.getElementById('returnHomeButton').addEventListener('click', () => {
                window.location.href = '/';
            });
        }

        const reversedRounds = data.rounds.slice().reverse(); // Reverse the rounds array
        let nextMatchFound = false;

        reversedRounds.forEach((round, roundIndex) => {
            const roundDiv = document.createElement('div');
            roundDiv.classList.add('round');

            const roundHeader = document.createElement('h3');
            roundHeader.textContent = `Round ${data.rounds.length - roundIndex}`;
            roundHeader.style.textAlign = 'center'; // Center the round header
            roundDiv.appendChild(roundHeader);

            const roundList = document.createElement('ul');
            roundList.classList.add('list-group');

            round.forEach(match => {
                const matchItem = document.createElement('li');
                matchItem.classList.add('list-group-item');
                matchItem.style.textAlign = 'center'; // Center the match item text

                if (match.player2 === 'Bye') {
                    matchItem.textContent = `${match.player1} ganha um bye`;
                } else if (match.winner) {
                    matchItem.innerHTML = `<strong>${match.winner}</strong> derrotou ${match.winner === match.player1 ? match.player2 : match.player1}`;
                } else {
                    matchItem.textContent = `${match.player1} vs ${match.player2}`;
                    if (!nextMatchFound) {
                        matchItem.style.backgroundColor = '#ffff99'; // Highlight the next match
                        matchItem.style.fontWeight = 'bold';
                        nextMatchFound = true;
                    }
                }

                roundList.appendChild(matchItem);
            });

            roundDiv.appendChild(roundList);
            matchesList.appendChild(roundDiv);
        });

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