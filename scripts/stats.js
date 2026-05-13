/* ── Stats Page ── */
const StatsPage = (() => {
  let container;

  function init(containerEl) {
    container = containerEl;
    render();
  }

  function render() {
    const results = Storage.getResults();
    const players = Storage.getPlayers();

    if (results.length === 0) {
      container.innerHTML = `
        <div class="back-row">
          <button class="back-btn" data-nav="home">← Back</button>
          <h2 style="font-size:1.1rem;font-weight:600;">Stats</h2>
        </div>
        <div class="stats-empty">
          <span class="emoji">📊</span>
          <p>No games played yet.<br>Pick a game and get started!</p>
        </div>
      `;
      return;
    }

    const gameNames = {
      'nertz': 'Nertz',
      'spades': 'Spades',
      'hearts': 'Hearts',
      'wizard': 'Wizard',
      'golf': 'Golf',
      'phase10': 'Phase 10',
      'skyjo': 'SkyJo',
      'monopoly-deal': 'Monopoly Deal',
      '42': '42'
    };

    const gameIcons = {
      'nertz': '🃏',
      'spades': '♠️',
      'hearts': '♥️',
      'wizard': '🧙',
      'golf': '⛳',
      'phase10': '🔟',
      'skyjo': '✈️',
      'monopoly-deal': '🏠',
      '42': '🎱'
    };

    /* Group results by game */
    const byGame = {};
    results.forEach(r => {
      if (!byGame[r.game]) byGame[r.game] = [];
      byGame[r.game].push(r);
    });

    /* Compute per-game, per-player stats */
    const gameKeys = Object.keys(byGame).sort();
    let html = `
      <div class="back-row">
        <button class="back-btn" data-nav="home">← Back</button>
        <h2 style="font-size:1.1rem;font-weight:600;">Stats</h2>
      </div>
      <div class="section-title">${results.length} game${results.length !== 1 ? 's' : ''} recorded</div>
    `;

    gameKeys.forEach(gk => {
      const gResults = byGame[gk];
      const displayName = gameNames[gk] || gk;
      const icon = gameIcons[gk] || '🎲';

      /* Collect all players across all sessions */
      const playerMap = {};
      gResults.forEach(r => {
        (r.players || []).forEach(p => {
          if (!playerMap[p.name]) {
            playerMap[p.name] = { name: p.name, games: 0, wins: 0, totalScore: 0 };
          }
          playerMap[p.name].games++;
          if (p.rank === 1) playerMap[p.name].wins++;
          if (typeof p.score === 'number') playerMap[p.name].totalScore += p.score;
        });
      });

      const sorted = Object.values(playerMap).sort((a, b) => b.wins - a.wins || b.games - a.games);

      html += `
        <div class="game-stats-block">
          <h3>${icon} ${displayName} (${gResults.length} session${gResults.length !== 1 ? 's' : ''})</h3>
          <table class="stats-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Played</th>
                <th>Wins</th>
                <th>Win %</th>
                ${sorted.some(p => p.totalScore !== 0) ? '<th>Avg Score</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${sorted.map(p => {
                const winPct = p.games > 0 ? (p.wins / p.games * 100).toFixed(0) : '—';
                const avgScore = p.games > 0 && sorted.some(x => x.totalScore !== 0)
                  ? (p.totalScore / p.games).toFixed(1)
                  : null;
                return `
                  <tr>
                    <td>${escapeHtml(p.name)}</td>
                    <td>${p.games}</td>
                    <td>${p.wins}</td>
                    <td>${winPct}%</td>
                    ${avgScore !== null ? `<td>${avgScore}</td>` : ''}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init };
})();
