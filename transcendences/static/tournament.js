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
            console.log(result);    
            if (result.success) {
                console.log("here");
                const tournamentId = result.tournament_id;
                window.history.pushState({}, '', `/tournament?tournament_id=${tournamentId}`);
                displaySection(`/tournament?tournament_id=${tournamentId}`);
            } else {
                console.log("her2e");
                alert(result.error);
            }
        } catch (error) {
            console.error('Error creating tournament:', error);
            alert('An error occurred while creating the tournament.');
        }
    });
}

export async function displayMatchups(tournamentId) {
    console.log(tournamentId);
    try {
        const response = await fetch(`/api/tournament/${tournamentId}/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const content = document.getElementById('content');
        console.log("here2");
        // Fetch the tournament view
        const viewResponse = await fetch('/static/views/tournament.html');
        if (!viewResponse.ok) {
            throw new Error(`HTTP error! status: ${viewResponse.status}`);
        }
        const viewHtml = await viewResponse.text();
        content.innerHTML = viewHtml;
        console.log("here");
        // Populate the view with matchups data
        document.querySelector('#tournament h2').textContent = `Matchups for ${data.name}`;
        const matchupsList = document.querySelector('#tournament .list-group');
        matchupsList.innerHTML = data.matchups.map(matchup => `
            <li class="list-group-item">
                ${matchup.player1} vs ${matchup.player2 || 'Bye'}
            </li>
        `).join('');

        // Add event listener to the start tournament button
        document.getElementById('startTournamentButton').addEventListener('click', () => startNextGame(tournamentId));
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
            const gameUrl = `/game-canva?mode=${gameMode}&tournament_id=${tournamentId}`;
            window.history.pushState({}, '', gameUrl);
            displaySection(gameUrl);
        }
    })
    .catch(error => {
        console.error('Error starting next game:', error);
    });
}

export function getCurrentMatchup(tournamentId) {
    return fetch(`/api/tournament/${tournamentId}/`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            const matchups = data.matchups;
            for (let matchup of matchups) {
                if (!matchup.winner) {
                    return matchup;
                }
            }
            throw new Error('No more matchups available');
        })
        .catch(error => {
            console.error('Error fetching current matchup:', error);
            throw error;
        });
}