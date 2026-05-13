/* ── App Shell ── */
const App = (() => {
  /* Game modules register themselves here */
  const GAMES = [];
  const MODULES = {};

  function registerGame(mod) {
    GAMES.push({
      id: mod.id,
      name: mod.name,
      icon: mod.icon,
      coming: mod.coming !== false
    });
    MODULES[mod.id] = mod;
  }

  let currentPage = 'home';
  let appEl;

  function init() {
    appEl = document.getElementById('app');

    /* Register SW */
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    /* Build the shell */
    renderShell();

    /* Listen for hash changes */
    window.addEventListener('hashchange', onHashChange);

    /* Initial route */
    onHashChange();
  }

  function renderShell() {
    appEl.innerHTML = `
      <div class="app-header">
        <h1>Game Scorer</h1>
        <div class="nav-links">
          <button class="nav-btn active" data-nav="home">Games</button>
          <button class="nav-btn" data-nav="players">Players</button>
          <button class="nav-btn" data-nav="stats">Stats</button>
        </div>
      </div>
      <div id="page-home" class="page active"></div>
      <div id="page-players" class="page"></div>
      <div id="page-stats" class="page"></div>
      <div id="page-game" class="page"></div>
    `;

    /* Delegate clicks for nav buttons, back buttons, etc */
    appEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-nav]');
      if (btn) {
        e.preventDefault();
        navigate(btn.dataset.nav);
      }
    });

    renderHome();
    PlayersPage.init(document.getElementById('page-players'));
    StatsPage.init(document.getElementById('page-stats'));
  }

  function renderHome() {
    const page = document.getElementById('page-home');
    page.innerHTML = `
      <div class="section-title">Pick a Game</div>
      <div class="game-grid">
        ${GAMES.map(g => `
          <div class="game-card" data-game="${g.id}" data-coming="${g.coming}">
            <span class="badge">${g.coming ? 'soon' : 'play'}</span>
            <span class="icon">${g.icon}</span>
            <span class="name">${g.name}</span>
          </div>
        `).join('')}
      </div>
    `;

    /* Bind game card clicks */
    page.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => {
        const gameId = card.dataset.game;
        const coming = card.dataset.coming === 'true';
        if (coming) {
          showToast('Coming soon!');
        } else {
          const mod = MODULES[gameId];
          if (mod && mod.launch) {
            navigate('game/' + gameId);
            mod.launch();
          }
        }
      });
    });
  }

  /* ── Temporary toast ── */
  function showToast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    Object.assign(t.style, {
      position: 'fixed',
      bottom: '100px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--bg-raised)',
      color: 'var(--text)',
      padding: '10px 24px',
      borderRadius: 'var(--radius)',
      fontSize: '0.9rem',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      zIndex: '1000',
      transition: 'opacity 0.3s',
      border: '1px solid rgba(255,255,255,0.06)'
    });
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2000);
  }

  function navigate(page) {
    if (page === currentPage) return;
    currentPage = page;

    /* Update nav button states */
    appEl.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.nav === page);
    });

    /* Show/hide pages */
    appEl.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetMap = {
      home: 'page-home',
      players: 'page-players',
      stats: 'page-stats',
    };

    if (targetMap[page]) {
      document.getElementById(targetMap[page]).classList.add('active');
      /* Re-render dynamic content on navigation */
      if (page === 'players') PlayersPage.init(document.getElementById('page-players'));
      if (page === 'stats') StatsPage.init(document.getElementById('page-stats'));
    } else if (page.startsWith('game/')) {
      document.getElementById('page-game').classList.add('active');
    }

    window.scrollTo(0, 0);
  }

  function onHashChange() {
    const hash = window.location.hash.slice(1) || 'home';
    navigate(hash);
  }

  /* ── Public API for game modules ── */
  function navigateTo(page) {
    window.location.hash = page;
  }

  function showGameScreen(html) {
    const container = document.getElementById('page-game');
    container.innerHTML = html;
    container.classList.add('active');
    currentPage = 'game';
    window.scrollTo(0, 0);
  }

  function goHome() {
    navigate('home');
  }

  return { init, registerGame, navigateTo, showGameScreen, goHome };
})();

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => App.init());
