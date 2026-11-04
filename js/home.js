/* wave.radio · js/home.js · Home screen. */
/* ---- home ---- */
const miniCard = s => `<button class="card" data-id="${esc(s.id)}"><div class="ban">${pic(s.banner_url, 'b')}</div><div class="cb"><div class="lg">${pic(s.logo_url, 'a')}</div><b>${esc(s.name)}${isLive(s) ? '<em class="live">LIVE</em>' : ''}</b><span class="tag" style="background:${esc(s.accent)};color:${onc(s.accent || '#c8f54b')}">wmz/${esc(s.tag)}</span><span>${vt(s.votes || 0)}</span></div></button>`;
async function loadHome(){
  const h = new Date().getHours();
  $('hHi').textContent = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + (user ? ', ' + who(user) : '');
  const prev = cSort; cSort = 'votes'; const a = await db.stations('', 0); cSort = prev;
  window.CS = Object.assign(window.CS || {}, Object.fromEntries(a.map(x => [x.id, x])));
  const live = a.filter(isLive);
  $('hOn').innerHTML = live.length ? live.map(miniCard).join('') : '<div class="empty">Nobody is on air right now. Be the first from Studio.</div>';
  $('hTop').innerHTML = a.length ? a.slice(0, 8).map(miniCard).join('') : '<div class="empty">No community stations yet.</div>';
  ['hOn', 'hTop'].forEach(id => $(id).querySelectorAll('.card').forEach(b => b.onclick = () => playComm(window.CS[b.dataset.id])));
  $('hGames').innerHTML = GAMES.map(gameCard).join('');
}
$('hMood').innerHTML = ['lofi', 'jazz', 'pop', 'rock', 'electronic', 'classical', 'hip hop', 'news'].map(g => `<button data-m="${g}">${g}</button>`).join('');
$('hMood').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; rGenre = b.dataset.m; rQ = ''; $('rq').value = ''; $('gen').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.g === rGenre)); go('real'); loadReal(true); };
