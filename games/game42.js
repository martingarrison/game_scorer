/* ── 42 Game Module ── */
const Game42 = (() => {
  let S = null; // session state

  /* ── Launch ── */
  function launch() {
    showSetup();
  }

  function cleanup() {
    S = null;
  }

  /* ── Screen 1: Setup ── */
  function showSetup() {
    const allPlayers = Storage.getPlayers();
    const used = new Set();

    App.showGameScreen(`
      <div class="game-screen">
        <div class="back-row">
          <button class="back-btn" data-nav="home">← Back</button>
          <h2 style="font-size:1.1rem;font-weight:600;">🎱 42</h2>
        </div>

        <p style="color:var(--text-dim);margin-bottom:12px;">Pick 4 players and pair them into two teams.</p>

        <div class="section-title">Team 1</div>
        <div id="team1-slots" class="player-select-grid" style="grid-template-columns:repeat(2,1fr);">
          ${allPlayers.map(p => `
            <button class="player-btn" data-id="${p.id}" data-name="${p.name}" data-team="1">${escape(p.name)}</button>
          `).join('')}
          ${allPlayers.length === 0 ? '<p style="color:var(--text-muted);grid-column:span 2;">Add players first!</p>' : ''}
        </div>

        <div class="section-title" style="margin-top:12px;">Team 2</div>
        <div id="team2-slots" class="player-select-grid" style="grid-template-columns:repeat(2,1fr);">
          ${allPlayers.map(p => `
            <button class="player-btn" data-id="${p.id}" data-name="${p.name}" data-team="2">${escape(p.name)}</button>
          `).join('')}
        </div>

        <div class="section-title" style="margin-top:12px;">Win by</div>
        <div style="display:flex;gap:8px;margin-bottom:16px;">
          <input type="number" id="target-score" value="252" min="42" max="500" step="42"
            style="flex:1;background:var(--bg-card);border:1px solid rgba(255,255,255,0.08);color:var(--text);padding:10px 14px;border-radius:var(--radius-sm);font-size:1rem;text-align:center;outline:none;">
        </div>

        <button class="btn-big" id="start-game" disabled>Select 4 players (2 per team)</button>
      </div>
    `);

    const team1Selected = new Set();
    const team2Selected = new Set();
    const startBtn = document.getElementById('start-game');

    function updateStartBtn() {
      const t1 = team1Selected.size;
      const t2 = team2Selected.size;
      if (t1 === 2 && t2 === 2) {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Game';
      } else {
        startBtn.disabled = true;
        startBtn.textContent = `Select 4 players (${t1 + t2}/4)`;
      }
    }

    document.querySelectorAll('#team1-slots .player-btn, #team2-slots .player-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const team = btn.dataset.team;

        /* Can't select same player for both teams */
        const otherTeam = team === '1' ? team2Selected : team1Selected;
        if (otherTeam.has(id)) {
          showToast('Already on the other team!');
          return;
        }

        const pool = team === '1' ? team1Selected : team2Selected;
        if (pool.has(id)) {
          pool.delete(id);
          btn.classList.remove('selected');
        } else {
          if (pool.size >= 2) {
            showToast('Team already has 2 players');
            return;
          }
          pool.add(id);
          btn.classList.add('selected');
        }
        updateStartBtn();
      });
    });

    startBtn.addEventListener('click', () => {
      if (team1Selected.size !== 2 || team2Selected.size !== 2) return;
      const target = parseInt(document.getElementById('target-score').value) || 252;

      function getNames(set) {
        return [...set].map(id => {
          const btn = document.querySelector(`[data-id="${id}"]`);
          return btn.dataset.name;
        });
      }

      const t1 = getNames(team1Selected);
      const t2 = getNames(team2Selected);

      startGame(t1, t2, target);
    });
  }

  /* ── Initialize session ── */
  function startGame(t1Players, t2Players, targetScore) {
    S = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
      game: '42',
      teams: [
        { id: 'team1', players: t1Players, score: 0 },
        { id: 'team2', players: t2Players, score: 0 }
      ],
      targetScore: targetScore || 252,
      hands: [],
      status: 'playing'
    };
    showPlay();
  }

  /* ── Team label helper ── */
  function teamLabel(team) {
    return team.players.join(' & ');
  }

  function otherTeam(teamId) {
    return S.teams.find(t => t.id !== teamId);
  }

  /* ── Screen 2: Play ── */
  function showPlay() {
    const t1 = S.teams[0];
    const t2 = S.teams[1];
    const lastHand = S.hands.length > 0 ? S.hands[S.hands.length - 1] : null;

    let html = `
      <div class="game-screen">
        <div class="back-row">
          <button class="back-btn" id="quit-game">← Quit</button>
          <h2 style="font-size:1.1rem;font-weight:600;">🎱 42</h2>
          <span style="margin-left:auto;font-size:0.8rem;color:var(--text-muted);">Target: ${S.targetScore}</span>
        </div>

        <div class="section-title">Scores</div>
        <div class="score-list">
          ${S.teams.map(t => {
            const leader = getLeadingTeam();
            return `
              <div class="score-row ${t.id === leader ? 'leader' : ''}">
                <span class="label">${escape(teamLabel(t))}</span>
                <span class="value">${t.score}</span>
              </div>
            `;
          }).join('')}
        </div>

        ${lastHand ? `
          <div class="hand-summary">
            <h3>Last Hand (Round ${lastHand.round})</h3>
            ${lastHand.bidType === 'nello'
              ? `<div class="hand-row"><span>${escape(lastHand.bidder.name)} bid NELLO</span><span class="pts">${lastHand.madeBid ? '✓ Made' : '✗ Failed'}</span></div>`
              : `<div class="hand-row"><span>${escape(lastHand.bidder.name)} bid ${lastHand.bidAmount}</span><span class="pts">${lastHand.madeBid ? '✓ Made' : '✗ Failed'}</span></div>`
            }
            <div class="hand-row">
              <span>${escape(teamLabel(lastHand.bidder.team))}</span>
              <span class="pts">+${lastHand.bidTeamScore}</span>
            </div>
            <div class="hand-row">
              <span>${escape(teamLabel(lastHand.opponent))}</span>
              <span class="pts">+${lastHand.oppTeamScore}</span>
            </div>
          </div>
        ` : '<p style="color:var(--text-muted);margin-bottom:16px;">No hands played yet. Start a new hand!</p>'}

        <button class="btn-big" id="new-hand">${S.hands.length === 0 ? 'Start First Hand' : 'New Hand'}</button>
        <button class="btn-big secondary" id="end-game-btn" style="margin-top:12px;">End Game</button>
      </div>
    `;

    App.showGameScreen(html);
    document.getElementById('new-hand').addEventListener('click', showBid);
    document.getElementById('end-game-btn').addEventListener('click', confirmEndGame);
    document.getElementById('quit-game').addEventListener('click', confirmQuit);
  }

  /* ── Screen 3: Bid Entry ── */
  function showBid() {
    const allPlayers = [
      ...S.teams[0].players.map(p => ({ name: p, teamId: 'team1' })),
      ...S.teams[1].players.map(p => ({ name: p, teamId: 'team2' }))
    ];

    App.showGameScreen(`
      <div class="game-screen">
        <div class="back-row">
          <button class="back-btn" id="cancel-bid">← Cancel</button>
          <h2 style="font-size:1.1rem;font-weight:600;">Hand ${S.hands.length + 1}</h2>
        </div>

        <div class="section-title">Who was the high bidder?</div>
        <div class="player-select-grid" id="bidder-grid">
          ${allPlayers.map(p => `
            <button class="player-btn" data-name="${p.name}" data-team="${p.teamId}">${escape(p.name)}</button>
          `).join('')}
        </div>

        <div id="bid-form" class="hidden">
          <div class="section-title">Bid Type</div>
          <div class="player-select-grid" style="grid-template-columns:repeat(2,1fr);" id="bid-type-grid">
            <button class="player-btn selected" data-type="normal">Normal</button>
            <button class="player-btn" data-type="nello">Nello</button>
          </div>

          <div class="section-title" id="bid-amount-label">Bid Amount</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;" id="bid-presets">
            <button class="player-btn" data-bid="30">30</button>
            <button class="player-btn" data-bid="31">31</button>
            <button class="player-btn" data-bid="32">32</button>
            <button class="player-btn" data-bid="33">33</button>
            <button class="player-btn" data-bid="34">34</button>
            <button class="player-btn" data-bid="35">35</button>
            <button class="player-btn" data-bid="36">36</button>
            <button class="player-btn" data-bid="37">37</button>
            <button class="player-btn" data-bid="38">38</button>
            <button class="player-btn" data-bid="39">39</button>
            <button class="player-btn" data-bid="40">40</button>
            <button class="player-btn" data-bid="41">41</button>
            <button class="player-btn" data-bid="42">42</button>
            <button class="player-btn" data-bid="84">84</button>
          </div>

          <div style="margin-bottom:16px;">
            <span style="color:var(--text-muted);font-size:0.85rem;">Or enter manually: </span>
            <input type="number" id="bid-custom" value="" min="30" max="168"
              style="width:80px;background:var(--bg-card);border:1px solid rgba(255,255,255,0.08);color:var(--text);padding:8px 10px;border-radius:var(--radius-sm);font-size:1rem;text-align:center;outline:none;" inputmode="numeric">
          </div>

          <button class="btn-big" id="confirm-bid" disabled>Waiting for bid...</button>
        </div>
      </div>
    `);

    let selectedBidder = null;
    let selectedBidType = 'normal';
    let selectedBid = null;

    const bidForm = document.getElementById('bid-form');
    const confirmBtn = document.getElementById('confirm-bid');

    document.getElementById('cancel-bid').addEventListener('click', showPlay);

    /* Bidder selection */
    document.querySelectorAll('#bidder-grid .player-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#bidder-grid .player-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedBidder = { name: btn.dataset.name, teamId: btn.dataset.team };
        bidForm.classList.remove('hidden');
        updateConfirm();
      });
    });

    /* Bid type toggle */
    document.querySelectorAll('#bid-type-grid .player-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#bid-type-grid .player-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedBidType = btn.dataset.type;
        const label = document.getElementById('bid-amount-label');
        label.textContent = selectedBidType === 'nello' ? 'Nello bid (takes 0 tricks)' : 'Bid Amount';
        if (selectedBidType === 'nello') {
          selectedBid = 'nello';
          document.querySelectorAll('#bid-presets .player-btn').forEach(b => b.classList.remove('selected'));
          document.getElementById('bid-custom').value = '';
        } else if (selectedBid === 'nello') {
          selectedBid = null;
        }
        updateConfirm();
      });
    });

    /* Bid presets */
    document.querySelectorAll('#bid-presets .player-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (selectedBidType === 'nello') return;
        document.querySelectorAll('#bid-presets .player-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedBid = parseInt(btn.dataset.bid);
        document.getElementById('bid-custom').value = selectedBid;
        updateConfirm();
      });
    });

    /* Custom bid input */
    document.getElementById('bid-custom').addEventListener('input', e => {
      if (selectedBidType === 'nello') return;
      const val = parseInt(e.target.value);
      if (!isNaN(val) && val >= 30) {
        selectedBid = val;
        document.querySelectorAll('#bid-presets .player-btn').forEach(b => b.classList.remove('selected'));
        /* Highlight closest preset */
        document.querySelectorAll('#bid-presets .player-btn').forEach(b => {
          if (parseInt(b.dataset.bid) === val) b.classList.add('selected');
        });
      } else {
        selectedBid = null;
      }
      updateConfirm();
    });

    function updateConfirm() {
      if (!selectedBidder) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Select high bidder';
        return;
      }
      if (selectedBidType === 'nello') {
        confirmBtn.disabled = false;
        confirmBtn.textContent = `Bid: NELLO — confirm`;
        return;
      }
      if (selectedBid && selectedBid >= 30) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = `Bid: ${selectedBid} — confirm`;
        return;
      }
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Enter a bid amount';
    }

    confirmBtn.addEventListener('click', () => {
      if (confirmBtn.disabled) return;
      const isNello = selectedBidType === 'nello';
      const bidAmount = isNello ? 'nello' : selectedBid;
      showResult(selectedBidder, isNello, bidAmount);
    });
  }

  /* ── Screen 4: Hand Result ── */
  function showResult(bidder, isNello, bidAmount) {
    const bidTeam = S.teams.find(t => t.id === bidder.teamId);
    const oppTeam = otherTeam(bidder.teamId);
    const bidVal = isNello ? 42 : bidAmount;
    const totalPoints = 42;

    App.showGameScreen(`
      <div class="game-screen">
        <div class="back-row">
          <button class="back-btn" id="back-to-bid">← Back</button>
          <h2 style="font-size:1.1rem;font-weight:600;">Hand Result</h2>
        </div>

        <div style="background:var(--bg-card);border-radius:var(--radius);padding:16px;margin-bottom:16px;">
          <p><strong>Bidder:</strong> ${escape(bidder.name)} (${escape(teamLabel(bidTeam))})</p>
          <p><strong>Bid:</strong> ${isNello ? 'NELLO' : bidAmount}</p>
        </div>

        <div class="section-title">Did ${escape(bidder.name)} make their bid?</div>
        <div class="player-select-grid" id="made-grid" style="grid-template-columns:repeat(2,1fr);margin-bottom:16px;">
          <button class="player-btn" data-made="yes" id="made-yes">✓ Yes</button>
          <button class="player-btn" data-made="no" id="made-no">✗ No</button>
        </div>

        <div id="points-form" class="hidden">
          <div class="section-title">Points Earned</div>
          <p style="color:var(--text-dim);margin-bottom:8px;">Out of ${totalPoints} total points in this hand.</p>

          <div class="penalty-input-row">
            <span class="label">${escape(teamLabel(bidTeam))}</span>
            <input type="number" id="bid-team-points" value="" min="0" max="${totalPoints}" inputmode="numeric"
              style="width:80px;background:var(--bg-card);border:1px solid rgba(255,255,255,0.08);color:var(--text);padding:8px 10px;border-radius:var(--radius-sm);font-size:1rem;text-align:center;outline:none;">
          </div>
          <div class="penalty-input-row">
            <span class="label">${escape(teamLabel(oppTeam))}</span>
            <span id="opp-points-display" style="font-weight:600;font-size:1rem;">—</span>
          </div>

          <div id="scoring-preview" style="background:var(--bg-raised);border-radius:var(--radius-sm);padding:14px;margin:12px 0;">
            <p style="color:var(--text-dim);font-size:0.85rem;margin-bottom:4px;">Resulting scores:</p>
            <div class="hand-row">
              <span>${escape(teamLabel(bidTeam))}</span>
              <span class="pts" id="bid-result-preview">+0</span>
            </div>
            <div class="hand-row">
              <span>${escape(teamLabel(oppTeam))}</span>
              <span class="pts" id="opp-result-preview">+0</span>
            </div>
          </div>

          <button class="btn-big" id="confirm-hand" disabled>Enter points</button>
        </div>
      </div>
    `);

    let madeBid = null;
    const pointsForm = document.getElementById('points-form');

    document.getElementById('back-to-bid').addEventListener('click', () => showBid());

    document.querySelectorAll('#made-grid .player-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#made-grid .player-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        madeBid = btn.dataset.made === 'yes';
        pointsForm.classList.remove('hidden');
        updatePreview();
      });
    });

    const bidInput = document.getElementById('bid-team-points');
    bidInput.addEventListener('input', updatePreview);

    function updatePreview() {
      if (madeBid === null) return;

      let bidTeamPts = parseInt(bidInput.value);
      if (isNaN(bidTeamPts) || bidTeamPts < 0) bidTeamPts = 0;
      if (bidTeamPts > totalPoints) bidTeamPts = totalPoints;
      const oppTeamPts = totalPoints - bidTeamPts;

      document.getElementById('opp-points-display').textContent = oppTeamPts;

      let bidTeamScore, oppTeamScore;

      if (isNello) {
        if (madeBid) {
          bidTeamScore = 84;
          oppTeamScore = 0;
        } else {
          bidTeamScore = 0;
          oppTeamScore = 84;
        }
      } else {
        if (madeBid) {
          bidTeamScore = bidTeamPts;
          oppTeamScore = oppTeamPts;
        } else {
          bidTeamScore = 0;
          oppTeamScore = oppTeamPts + bidVal;
        }
      }

      document.getElementById('bid-result-preview').textContent = `+${bidTeamScore}`;
      document.getElementById('opp-result-preview').textContent = `+${oppTeamScore}`;

      const confirmBtn = document.getElementById('confirm-hand');
      if (!isNaN(parseInt(bidInput.value)) && parseInt(bidInput.value) >= 0 && parseInt(bidInput.value) <= totalPoints) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = `Confirm — ${teamLabel(bidTeam)} +${bidTeamScore}, ${teamLabel(oppTeam)} +${oppTeamScore}`;
      } else {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Enter points (0–42)';
      }

      /* Store computed scores for use on confirm */
      confirmBtn._computed = { bidTeamScore, oppTeamScore, bidTeamPts, oppTeamPts };
    }

    document.getElementById('confirm-hand').addEventListener('click', () => {
      const btn = document.getElementById('confirm-hand');
      if (btn.disabled) return;
      const { bidTeamScore, oppTeamScore, bidTeamPts, oppTeamPts } = btn._computed;
      recordHand(bidder, isNello, bidVal, madeBid, bidTeamPts, oppTeamPts, bidTeamScore, oppTeamScore);
    });
  }

  /* ── Record hand ── */
  function recordHand(bidder, isNello, bidVal, madeBid, bidTeamPts, oppTeamPts, bidTeamScore, oppTeamScore) {
    const bidTeam = S.teams.find(t => t.id === bidder.teamId);
    const oppTeam = otherTeam(bidder.teamId);

    const hand = {
      round: S.hands.length + 1,
      bidder: { name: bidder.name, team: { id: bidTeam.id, players: [...bidTeam.players] } },
      opponent: { id: oppTeam.id, players: [...oppTeam.players] },
      bidType: isNello ? 'nello' : 'normal',
      bidAmount: isNello ? 'nello' : bidVal,
      madeBid,
      bidTeamActual: bidTeamPts,
      oppTeamActual: oppTeamPts,
      bidTeamScore,
      oppTeamScore
    };

    S.hands.push(hand);
    bidTeam.score += bidTeamScore;
    oppTeam.score += oppTeamScore;

    /* Check if game over */
    if (bidTeam.score >= S.targetScore || oppTeam.score >= S.targetScore) {
      S.status = 'finished';
      showEnd();
    } else {
      showPlay();
    }
  }

  /* ── Screen 5: End Game ── */
  function showEnd() {
    const sorted = [...S.teams].sort((a, b) => b.score - a.score); // higher score wins in 42
    const winner = sorted[0];

    const result = {
      game: '42',
      players: sorted.map((t, i) => ({
        name: teamLabel(t),
        score: t.score,
        rank: i + 1
      })),
      winner: teamLabel(winner),
      handsPlayed: S.hands.length
    };

    /* Save individual players too for cross-game stats */
    const playerResults = [];
    sorted.forEach(t => {
      t.players.forEach(p => {
        playerResults.push({ name: p, score: t.score, rank: sorted.indexOf(t) + 1 });
      });
    });
    Storage.saveResult({
      game: '42',
      players: playerResults,
      winner: winner.players.join(' & '),
      handsPlayed: S.hands.length
    });

    App.showGameScreen(`
      <div class="game-screen">
        <div class="end-game-hero">
          <span class="trophy">🏆</span>
          <h2>${escape(teamLabel(winner))} wins!</h2>
          <p>${S.hands.length} hands · target ${S.targetScore}</p>
        </div>

        <div class="score-list">
          ${sorted.map((t, i) => `
            <div class="score-row ${t.id === winner.id ? 'leader' : ''}">
              <span class="label">${i + 1}. ${escape(teamLabel(t))}</span>
              <span class="value">${t.score}</span>
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

  /* ── Helpers ── */
  function getLeadingTeam() {
    return S.teams.reduce((best, t) => t.score > best.score ? t : best, S.teams[0]).id;
  }

  function confirmEndGame() {
    if (!confirm('End the game now? Current scores will be lost.')) return;
    S = null;
    App.goHome();
  }

  function confirmQuit() {
    if (S.hands.length === 0) {
      S = null;
      App.goHome();
      return;
    }
    if (confirm('Quit this game? You will lose progress on this session.')) {
      S = null;
      App.goHome();
    }
  }

  function escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ── Module definition ── */
  return {
    id: '42',
    name: '42',
    icon: '🎱',
    coming: false,
    minPlayers: 4,
    maxPlayers: 4,
    launch,
    cleanup,
    rules: `**42** (Texas 42) is a trick-taking domino game for four players in fixed partnerships.

**Setup:** Each player draws 7 dominoes. The player holding the 0-1 domino bids first.

**Bidding:** Each player may bid or pass. Bids range from 30 to 42 in 1-point increments. A bid of 42 can be doubled to 84, and doubled again to 168. The high bidder names trump.

**Special bids:** Nello (or zero) means the bidder tries to take 0 tricks. Making Nello scores 84 points. Failing Nello gives opponents 84 points.

**Scoring:** Each hand has 42 total points: 7 tricks (1 point each) + 5 honors (dominoes totaling 5 or a multiple of 5). If the bidding team makes their bid, both teams score their actual points. If they fail, they score 0 and opponents score their actual points plus the bid amount.

**Winning:** First team to reach the target score (default 252) wins.`
  };
})();

App.registerGame(Game42);
