
    // Elementos das estatísticas
const statsSection = document.getElementById('statistics');
const profileSection = document.getElementById('profile');
const matchHistory = document.getElementById('matchHistory');
const totalWins = document.getElementById('totalWins');
const totalLosses = document.getElementById('totalLosses');
const winRate = document.getElementById('winRate');

export function loadStatistics() {
    // Simular dados do backend - substitua por sua chamada API real
    const mockData = {
        matches: [
            { date: '2024-10-24', opponent: 'Player1', result: 'Vitória', score: '10-8' },
            { date: '2024-10-23', opponent: 'Player2', result: 'Derrota', score: '7-10' },
            { date: '2024-10-22', opponent: 'Player3', result: 'Vitória', score: '10-5' }
        ],
        stats: {
            wins: 2,
            losses: 1
        }
    };

    // Atualizar contadores
    totalWins.textContent = mockData.stats.wins;
    totalLosses.textContent = mockData.stats.losses;
    const winRateCalc = (mockData.stats.wins / (mockData.stats.wins + mockData.stats.losses) * 100).toFixed(1);
    winRate.textContent = `${winRateCalc}%`;

    // Limpar e preencher tabela de histórico
    matchHistory.innerHTML = '';
    mockData.matches.forEach(match => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(match.date).toLocaleDateString()}</td>
            <td>${match.opponent}</td>
            <td><span class="badge ${match.result === 'Vitória' ? 'bg-success' : 'bg-danger'}">${match.result}</span></td>
            <td>${match.score}</td>
        `;
        matchHistory.appendChild(row);
    });

    // Criar gráfico
    const ctx = document.getElementById('statsChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Vitórias', 'Derrotas'],
            datasets: [{
                data: [mockData.stats.wins, mockData.stats.losses],
                backgroundColor: [
                    'rgba(40, 167, 69, 0.8)',
                    'rgba(220, 53, 69, 0.8)'
                ],
                borderColor: [
                    'rgba(40, 167, 69, 1)',
                    'rgba(220, 53, 69, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}