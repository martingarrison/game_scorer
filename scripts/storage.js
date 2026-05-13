/* ── Storage Layer ── */
const Storage = (() => {
  const PREFIX = 'game_scorer_';

  function get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function set(key, value) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  }

  function remove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  /* ── Players ── */
  function getPlayers() {
    return get('players') || [];
  }

  function savePlayers(players) {
    set('players', players);
  }

  function addPlayer(name) {
    const players = getPlayers();
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    players.push({ id, name: name.trim() });
    savePlayers(players);
    return players;
  }

  function removePlayer(id) {
    const players = getPlayers().filter(p => p.id !== id);
    savePlayers(players);
    return players;
  }

  /* ── Game Results ── */
  function getResults() {
    return get('results') || [];
  }

  function saveResult(result) {
    const results = getResults();
    results.push({
      ...result,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: result.date || new Date().toISOString()
    });
    set('results', results);
    return results;
  }

  function clearResults() {
    remove('results');
  }

  /* ── Saved Sessions ── */
  function getSessions() {
    return get('sessions') || [];
  }

  function saveSession(session) {
    const sessions = getSessions();
    session.id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    session.updatedAt = new Date().toISOString();
    sessions.push(session);
    set('sessions', sessions);
    return sessions;
  }

  function updateSession(id, data) {
    const sessions = getSessions();
    const idx = sessions.findIndex(s => s.id === id);
    if (idx === -1) return sessions;
    sessions[idx] = { ...sessions[idx], ...data, updatedAt: new Date().toISOString() };
    set('sessions', sessions);
    return sessions;
  }

  function deleteSession(id) {
    const sessions = getSessions().filter(s => s.id !== id);
    set('sessions', sessions);
    return sessions;
  }

  /* ── Exports ── */
  return {
    getPlayers,
    savePlayers,
    addPlayer,
    removePlayer,
    getResults,
    saveResult,
    clearResults,
    getSessions,
    saveSession,
    updateSession,
    deleteSession
  };
})();
