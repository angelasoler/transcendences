class StatsService {
    async getStatistics() {
        try {
            // Fetch para obter as partidas
            const matchesResponse = await fetch('/api/matches/', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (!matchesResponse.ok) throw new Error('Erro ao obter partidas');
            
            const matchesData = await matchesResponse.json();
            const matches = matchesData.matches; // Extract the array
    
            // Fetch para obter as estatísticas
            const statsResponse = await fetch('/api/matches/stats/', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
    
            if (!statsResponse.ok) throw new Error('Erro ao obter estatísticas');
    
            const stats = await statsResponse.json();
    
            return {
                matches,
                stats,
            };
        } catch (error) {
            console.error('Erro ao obter estatísticas:', error);
            return null;
        }
    }
}

class StatsView {
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
        const total = stats.wins + stats.losses;
        const winRateCalc = total > 0 ? (stats.wins / total * 100).toFixed(1) : '0.0';
        this.elements.winRate.textContent = `${winRateCalc}%`;
    }

    updateMatchHistory(matches) {
        this.elements.matchHistory.innerHTML = '';
        matches.forEach(match => {
            const resultText = match.result === 'Win' ? 'Vitória' : 'Derrota';
            const badgeClass = match.result === 'Win' ? 'bg-success' : 'bg-danger';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(match.date).toLocaleDateString()}</td>
                <td>${this.escapeHtml(match.opponent)}</td>
                <td><span class="badge ${badgeClass}">${resultText}</span></td>
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
        if (!this.profileClickHandler) {
            this.profileClickHandler = this.handleProfileClick.bind(this);
        }

        const profileLink = document.querySelector('[data-route="profile"]');
        if (profileLink && !profileLink.dataset.bound) {
            profileLink.addEventListener('click', this.profileClickHandler);
            profileLink.dataset.bound = 'true';  // Mark this link as bound to avoid duplicate listeners
        }
    }

    handleProfileClick() {
        if (this.statsView.elements.statsSection) {
            this.statsView.elements.statsSection.classList.add('d-none');
        }
        if (this.statsView.elements.profileSection) {
            this.statsView.elements.profileSection.classList.remove('d-none');
        }
    }

    async loadStatistics() {
        try {
            const data = await this.statsService.getStatistics();
            
            if (data) {
                this.statsView.updateCounters(data.stats);
                this.statsView.updateMatchHistory(data.matches);
                this.statsView.createPieChart(data.stats);
            } else {
                this.statsView.showError('Erro ao carregar estatísticas. Tente novamente mais tarde.');
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            this.statsView.showError('Erro ao carregar estatísticas. Tente novamente mais tarde.');
        }
    }
}
