/* ── Players Page ── */
const PlayersPage = (() => {
  let container;

  function init(containerEl) {
    container = containerEl;
    render();
  }

  function render() {
    const players = Storage.getPlayers();

    container.innerHTML = `
      <div class="back-row">
        <button class="back-btn" data-nav="home">← Back</button>
        <h2 style="font-size:1.1rem;font-weight:600;">Players</h2>
      </div>

      <div class="section-title">Roster (${players.length})</div>

      <div class="player-list" id="player-list">
        ${players.length === 0
          ? `<p style="color:var(--text-muted);padding:12px 0;">No players yet. Add one below.</p>`
          : players.map(p => `
            <div class="player-row" data-id="${p.id}">
              <span class="name">${escapeHtml(p.name)}</span>
              <button class="delete-btn" data-action="delete-player" data-id="${p.id}">✕</button>
            </div>
          `).join('')
        }
      </div>

      <form class="add-player-form" id="add-player-form">
        <input type="text" id="player-name-input" placeholder="Player name..." maxlength="24" autocomplete="off">
        <button type="submit" class="btn">Add</button>
      </form>
    `;

    bindEvents();
  }

  function bindEvents() {
    const form = container.querySelector('#add-player-form');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = container.querySelector('#player-name-input');
      const name = input.value.trim();
      if (!name) return;
      Storage.addPlayer(name);
      input.value = '';
      render();
    });

    container.querySelectorAll('[data-action="delete-player"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (confirm('Remove this player? Their stats will remain in game history.')) {
          Storage.removePlayer(id);
          render();
        }
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init };
})();
