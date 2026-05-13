/* ── Nertz Game Module ── */
const NertzGame = (() => {
  /* Session state */
  let S = null; // { id, players, targetScore, hands[], cumulative{}, status }

  function launch() {
    /* If resuming, could check for saved session — for now, always start fresh */
    showSetup();
  }

  function cleanup() {
    S = null;
  }

  /* ── Screen 1: Setup ── */
  function showSetup() {
    const allPlayers = Storage.getPlayers();

    App.showGameScreen(`
      <div class="game-screen">
        <div class="back-row">
          <button class="back-btn" data-nav="home">← Back</button>
          <h2 style="font-size:1.1rem;font-weight:600;">🃏 Nertz</h2>
        </div>

        <div class="section-title">Players</div>
        <div class="player-select-grid" id="setup-players">
          ${allPlayers.map(p => `
            <button class="player-btn" data-id="${p.id}" data-name="${p.name}">${escape(p.name)}</button>
          `).join('')}
          ${allPlayers.length === 0 ? '<p style="color:var(--text-muted);grid-column:span 2;">Add players first!</p>' : ''}
        </div>

        <div class="section-title" style="margin-top:12px;">Target Score</div>
        <div style="display:flex;gap:8px;margin-bottom:16px;">
          <input type="number" id="target-score" value="100" min="25" max="500" step="25"
            style="flex:1;background:var(--bg-card);border:1px solid rgba(255,255,255,0.08);color:var(--text);padding:10px 14px;border-radius:var(--radius-sm);font-size:1rem;text-align:center;outline:none;">
        </div>

        <button class="btn-big" id="start-game" disabled>Select players to begin</button>
      </div>
    `);

    const selected = new Set();
    const startBtn = document.getElementById('start-game');

    document.querySelectorAll('#setup-players .player-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (selected.has(id)) {
          selected.delete(id);
          btn.classList.remove('selected');
        } else {
          selected.add(id);
          btn.classList.add('selected');
        }
        const count = selected.size;
        if (count < 2) {
          startBtn.disabled = true;
          startBtn.textContent = 'Need at least 2 players';
        } else {
          startBtn.disabled = false;
          startBtn.textContent = `Start Game (${count} players)`;
        }
      });
    });

    startBtn.addEventListener('click', () => {
      if (selected.size < 2) return;
      const target = parseInt(document.getElementById('target-score').value) || 100;
      const players = [...selected].map(id => {
        const btn = document.querySelector(`#setup-players .player-btn[data-id="${id}"]`);
        return btn.dataset.name;
      });
      startGame(players, target);
    });
  }

  /* ── Initialize session and show play screen ── */
  function startGame(players, targetScore) {
    const cumulative = {};
    players.forEach(p => { cumulative[p] = 0; });

    S = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
      game: 'nertz',
      players,
      targetScore: targetScore || 100,
      hands: [],
      cumulative,
      status: 'playing'
    };

    showPlay();
  }

  /* ── Screen 2: Main Play Screen ── */
  function showPlay() {
    const leader = getLeader();
    let html = `
      <div class="game-screen">
        <div class="back-row">
          <button class="back-btn" id="quit-game">← Quit</button>
          <h2 style="font-size:1.1rem;font-weight:600;">🃏 Nertz</h2>
          <span style="margin-left:auto;font-size:0.8rem;color:var(--text-muted);">Target: ${S.targetScore}</span>
        </div>

        <div class="section-title">Hand ${S.hands.length + 1} · Cumulative Scores</div>
        <div class="score-list">
          ${S.players.map(p => `
            <div class="score-row ${p === leader ? 'leader' : ''}">
              <span class="label">${escape(p)}</span>
              <span class="value">${S.cumulative[p]}</span>
            </div>
          `).join('')}
        </div>

        <button class="btn-big" id="nertz-called">Someone called NERTZ!</button>

        ${S.hands.length > 0 ? `
          <div class="hand-summary">
            <h3>Last Hand</h3>
            ${S.hands[S.hands.length - 1].penalties.map(p => `
              <div class="hand-row ${p.winner ? 'winner' : ''}">
                <span>${escape(p.name)}</span>
                <span class="pts">+${p.points}${p.winner ? ' ← out' : ''}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <button class="btn-big secondary" id="end-game-btn" style="margin-top:12px;">End Game</button>
      </div>
    `;

    App.showGameScreen(html);

    document.getElementById('nertz-called').addEventListener('click', showNertzCalled);
    document.getElementById('end-game-btn').addEventListener('click', confirmEndGame);
    document.getElementById('quit-game').addEventListener('click', confirmQuit);
  }

  /* ── Screen 3: Who went out? ── */
  function showNertzCalled() {
    App.showGameScreen(`
      <div class="game-screen">
        <div class="back-row">
          <button class="back-btn" id="cancel-nertz">← Cancel</button>
          <h2 style="font-size:1.1rem;font-weight:600;">Who went out?</h2>
        </div>

        <p style="color:var(--text-dim);margin-bottom:16px;">Tap the player who called Nertz (they get 0 points).</p>

        <div class="player-select-grid" id="winner-grid">
          ${S.players.map(p => `
            <button class="player-btn" data-name="${p}">${escape(p)}</button>
          `).join('')}
        </div>
      </div>
    `);

    document.getElementById('cancel-nertz').addEventListener('click', showPlay);

    document.querySelectorAll('#winner-grid .player-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        showPenaltyEntry(btn.dataset.name);
      });
    });
  }

  /* ── Screen 4: Enter penalty points ── */
  function showPenaltyEntry(winner) {
    const others = S.players.filter(p => p !== winner);
    App.showGameScreen(`
      <div class="game-screen">
        <div class="back-row">
          <button class="back-btn" id="back-to-winner">← Back</button>
          <h2 style="font-size:1.1rem;font-weight:600;">Enter Penalties</h2>
        </div>

        <p style="color:var(--text-dim);margin-bottom:12px;">
          ${escape(winner)} went out (0 pts). Enter remaining players' penalty points.
        </p>

        ${others.map(p => `
          <div class="penalty-input-row">
            <span class="label">${escape(p)}</span>
            <input type="number" class="penalty-input" data-player="${p}" value="0" min="0" max="500" inputmode="numeric">
          </div>
        `).join('')}

        <button class="btn-big" id="confirm-hand" disabled>Enter penalties to confirm</button>

        <button class="btn-big secondary" id="quick-all-10" style="margin-top:8px;">Quick: everyone else = 10</button>
        <button class="btn-big secondary" id="quick-all-25" style="margin-top:4px;">Quick: everyone else = 25</button>
        <button class="btn-big secondary" id="quick-all-50" style="margin-top:4px;">Quick: everyone else = 50</button>
      </div>
    `);

    const confirmBtn = document.getElementById('confirm-hand');

    function checkReady() {
      const inputs = document.querySelectorAll('.penalty-input');
      const allFilled = [...inputs].every(inp => inp.value !== '' && parseInt(inp.value) >= 0);
      confirmBtn.disabled = !allFilled;
      confirmBtn.textContent = allFilled ? 'Confirm Hand' : 'Enter all penalties';
    }

    document.querySelectorAll('.penalty-input').forEach(inp => {
      inp.addEventListener('input', checkReady);
    });

    document.getElementById('back-to-winner').addEventListener('click', showNertzCalled);

    /* Quick fill buttons */
    function quickFill(val) {
      document.querySelectorAll('.penalty-input').forEach(inp => { inp.value = val; });
      checkReady();
    }
    document.getElementById('quick-all-10').addEventListener('click', () => quickFill(10));
    document.getElementById('quick-all-25').addEventListener('click', () => quickFill(25));
    document.getElementById('quick-all-50').addEventListener('click', () => quickFill(50));

    confirmBtn.addEventListener('click', () => {
      const penalties = {};
      penalties[winner] = 0;
      document.querySelectorAll('.penalty-input').forEach(inp => {
        penalties[inp.dataset.player] = parseInt(inp.value) || 0;
      });
      recordHand(winner, penalties);
    });
  }

  /* ── Record a hand ── */
  function recordHand(winner, penalties) {
    const hand = {
      round: S.hands.length + 1,
      winner,
      penalties: S.players.map(p => ({
        name: p,
        points: penalties[p],
        winner: p === winner
      }))
    };
    S.hands.push(hand);

    /* Update cumulative */
    S.players.forEach(p => {
      S.cumulative[p] += penalties[p];
    });

    /* Check if game should end */
    const anyoneOver = S.players.some(p => S.cumulative[p] >= S.targetScore);
    if (anyoneOver) {
      S.status = 'finished';
      showEnd();
    } else {
      showPlay();
    }
  }

  /* ── Screen 5: End Game ── */
  function showEnd() {
    const sorted = [...S.players].sort((a, b) => S.cumulative[a] - S.cumulative[b]);
    const winner = sorted[0];

    /* Save the result */
    const result = {
      game: 'nertz',
      players: sorted.map((p, i) => ({
        name: p,
        score: S.cumulative[p],
        rank: i + 1
      })),
      winner: winner,
      handsPlayed: S.hands.length,
      targetScore: S.targetScore
    };
    Storage.saveResult(result);

    App.showGameScreen(`
      <div class="game-screen">
        <div class="end-game-hero">
          <span class="trophy">🏆</span>
          <h2>${escape(winner)} wins!</h2>
          <p>${S.hands.length} hands · target ${S.targetScore}</p>
        </div>

        <div class="score-list">
          ${sorted.map((p, i) => `
            <div class="score-row ${p === winner ? 'leader' : ''}">
              <span class="label">${i + 1}. ${escape(p)}</span>
              <span class="value">${S.cumulative[p]}</span>
            </div>
          `).join('')}
        </div>

        <div class="btn-group">
          <button class="btn-big" id="play-again">Play Again</button>
          <button class="btn-big secondary" id="go-home">Back to Games</button>
        </div>
      </div>
    `);

    document.getElementById('play-again').addEventListener('click', () => {
      S = null;
      showSetup();
    });

    document.getElementById('go-home').addEventListener('click', () => {
      S = null;
      App.goHome();
    });
  }

  /* ── Confirm end / quit ── */
  function confirmEndGame() {
    if (!confirm('End the game now? Current scores will be lost.')) return;
    S.status = 'finished';
    /* Don't save — user quit */
    S = null;
    App.goHome();
  }

  function confirmQuit() {
    if (S.hands.length === 0) {
      /* No hands played, just leave */
      S = null;
      App.goHome();
      return;
    }
    if (confirm('Quit this game? You will lose progress on this session.')) {
      S = null;
      App.goHome();
    }
  }

  /* ── Helpers ── */
  function getLeader() {
    let lowest = Infinity, leader = null;
    S.players.forEach(p => {
      if (S.cumulative[p] < lowest) {
        lowest = S.cumulative[p];
        leader = p;
      }
    });
    return leader;
  }

  function escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ── Module definition ── */
  return {
    id: 'nertz',
    name: 'Nertz',
    icon: '🃏',
    coming: false,
    minPlayers: 2,
    maxPlayers: 6,
    launch,
    cleanup,
    rules: `**Nertz** (also called Nerts, Pounce, or Racing Demon) is a fast-paced multiplayer solitaire game.

**Setup:** Each player needs their own deck of cards. Deal 13 cards face-down as your Nertz pile, flip the top card. Deal 3 tableau piles. The rest is your hand.

**Gameplay:** Everyone plays simultaneously — no turns! Play cards from your Nertz pile or tableau onto shared foundation piles in the center. Foundations build up from Ace to King by suit, just like Solitaire.

**Calling Nertz:** When you empty your Nertz pile (all 13 cards played), yell "NERTZ!" Play stops immediately.

**Scoring:** Everyone counts their remaining cards:
- Aces = 1 point
- 2-10 = face value
- Jacks, Queens, Kings = 10 points
- Jokers = 15 points (if using)

The player who called Nertz gets 0 points. Everyone else adds their penalty total.

**Winning:** The player with the lowest cumulative score after someone reaches the target wins.`
  };
})();

/* ── Register with App ── */
App.registerGame(NertzGame);
