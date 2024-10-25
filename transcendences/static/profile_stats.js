export class StatsService {
    constructor() {
        this.API_URL = 'seu-backend-url/api'; // Substitua pela URL real da sua API
    }

    async getStatistics() {
        // Simulação de chamada API - substitua pelo fetch real
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    matches: [
                        { date: '2024-10-24', opponent: 'Player1', result: 'Vitória' },
                        { date: '2024-10-23', opponent: 'Player2', result: 'Derrota' },
                        { date: '2024-10-22', opponent: 'Player3', result: 'Vitória' }
                    ],
                    stats: {
                        wins: 2,
                        losses: 1
                    }
                });
            }, 500);
        });
    }
}

export class StatsView {
    constructor() {
        this.elements = {
            statsSection: document.getElementById('statistics'),
            profileSection: document.getElementById('profile'),
            matchHistory: document.getElementById('matchHistory'),
            totalWins: document.getElementById('totalWins'),
            totalLosses: document.getElementById('totalLosses'),
            winRate: document.getElementById('winRate'),
            errorMessage: document.getElementById('errorStats')
        };
        
        this.chart = null;
    }

    showError(message) {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
            this.elements.errorMessage.classList.remove('d-none');
        }
    }

    updateCounters(stats) {
        this.elements.totalWins.textContent = stats.wins;
        this.elements.totalLosses.textContent = stats.losses;
        const winRateCalc = (stats.wins / (stats.wins + stats.losses) * 100).toFixed(1);
        this.elements.winRate.textContent = `${winRateCalc}%`;
    }

    updateMatchHistory(matches) {
        this.elements.matchHistory.innerHTML = '';
        matches.forEach(match => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(match.date).toLocaleDateString()}</td>
                <td>${this.escapeHtml(match.opponent)}</td>
                <td><span class="badge ${match.result === 'Vitória' ? 'bg-success' : 'bg-danger'}">${match.result}</span></td>
            `;
            this.elements.matchHistory.appendChild(row);
        });
    }

    createPieChart(stats) {
        const canvas = document.getElementById('statsChart');
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;

        // Calcular ângulos baseado nas proporções
        const total = stats.wins + stats.losses;
        const winsAngle = (stats.wins / total) * 2 * Math.PI;

        // Limpar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Desenhar vitórias
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, 0, winsAngle);
        ctx.fillStyle = 'rgba(40, 167, 69, 0.8)';
        ctx.fill();

        // Desenhar derrotas
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, winsAngle, 2 * Math.PI);
        ctx.fillStyle = 'rgba(220, 53, 69, 0.8)';
        ctx.fill();
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

export class ProfileStats {
    constructor() {
        this.statsService = new StatsService();
        this.statsView = new StatsView();
        this.bindEvents();
    }

    bindEvents() {
        document.querySelector('[data-route="back-to-profile"]')?.addEventListener('click', () => {
            this.statsView.elements.statsSection.classList.add('d-none');
            this.statsView.elements.profileSection.classList.remove('d-none');
        });
    }

    async loadStatistics() {
        try {
            const data = await this.statsService.getStatistics();
            
            this.statsView.updateCounters(data.stats);
            this.statsView.updateMatchHistory(data.matches);
            this.statsView.createPieChart(data.stats);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            this.statsView.showError('Erro ao carregar estatísticas. Tente novamente mais tarde.');
        }
    }
}
