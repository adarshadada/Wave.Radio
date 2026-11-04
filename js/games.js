/* wave.radio · js/games.js · Solo games and the games list. */
/* ---- games ---- */
const bestOf = ls.get('wr_best', {});
function setBest(k, v, low){ const o = bestOf[k]; if (o === undefined || (low ? v < o : v > o)){ bestOf[k] = v; ls.set('wr_best', bestOf); renderGames(); return true; } return false; }
const QZ = [['What does FM stand for?', ['Frequency Modulation', 'Fast Music', 'Free Media', 'Final Mix'], 0], ['How many keys does a standard piano have?', ['66', '76', '88', '98'], 2],
  ['How many strings does a standard guitar have?', ['4', '5', '6', '7'], 2], ['What does BPM measure?', ['Volume', 'Tempo', 'Pitch', 'Length'], 1],
  ['Radio waves travel at the speed of…', ['Sound', 'Light', 'Wind', 'Lightning bolts'], 1], ['What does DJ stand for?', ['Disc Jockey', 'Digital Jam', 'Dance Junior', 'Double Journey'], 0],
  ['A Stradivarius is a famous type of…', ['Guitar', 'Drum', 'Violin', 'Flute'], 2], ['Which instrument has pedals and 88 keys?', ['Organ', 'Piano', 'Harp', 'Accordion'], 1]];
const MEMSHAPES = ['<circle cx="12" cy="12" r="8"/>', '<rect x="4" y="4" width="16" height="16" rx="2"/>', '<path d="M12 3l9 17H3z"/>', '<path d="M12 2l3 7 7 .8-5.3 4.8 1.6 7.4L12 18l-6.3 4 1.6-7.4L2 9.8 9 9z"/>', '<path d="M12 2l10 10-10 10L2 12z"/>', '<path d="M12 21s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 10c0 6-8 11-8 11z"/>', '<path d="M12 2l8.7 5v10L12 22l-8.7-5V7z"/>', '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>'];
function gMem(el){
  const d = [0, 1, 2, 3, 4, 5, 6, 7].flatMap(k => [k, k]).sort(() => Math.random() - .5); let open = [], moves = 0, done = 0, lock = false;
  el.innerHTML = '<div class="msg" id="mv">Moves: 0</div><div class="mem">' + d.map((k, i) => `<button class="mc" data-i="${i}" aria-label="Hidden card">?</button>`).join('') + '</div>';
  const face = (b, on) => { b.classList.toggle('up', on); b.innerHTML = on ? `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">${MEMSHAPES[d[b.dataset.i]]}</svg>` : '?'; };
  el.querySelectorAll('.mc').forEach(b => b.onclick = () => {
    if (lock || b.classList.contains('up')) return; face(b, true); open.push(b);
    if (open.length < 2) return; moves++; $('mv').textContent = 'Moves: ' + moves; lock = true; const [x, y] = open; open = [];
    if (d[x.dataset.i] === d[y.dataset.i]){ x.classList.add('ok'); y.classList.add('ok'); lock = false; if (++done === 8) $('mv').textContent = 'Done in ' + moves + ' moves' + (setBest('mem', moves, true) ? '. New best!' : '.'); }
    else setTimeout(() => { face(x, false); face(y, false); lock = false; }, 700);
  });
}
function gQuiz(el){
  const qs = QZ.slice().sort(() => Math.random() - .5).slice(0, 6); let i = 0, sc = 0;
  const show = () => {
    if (i >= qs.length){ const nb = setBest('quiz', sc); el.innerHTML = `<h3 class="disp">${sc} / ${qs.length}</h3><p class="msg">${nb ? 'New best!' : 'Nice run.'}</p><button class="btn" id="again" style="margin-top:12px">Play again</button>`; $('again').onclick = () => gQuiz(el); return; }
    const [q, o, c] = qs[i];
    el.innerHTML = `<div class="msg">Question ${i + 1} of ${qs.length}</div><p style="font-weight:700;font-size:18px;margin:8px 0 12px">${esc(q)}</p>` + o.map((t, k) => `<button class="opt" data-k="${k}">${esc(t)}</button>`).join('');
    el.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      const ok = +b.dataset.k === c; if (ok) sc++; el.querySelectorAll('.opt').forEach(x => { x.disabled = true; if (+x.dataset.k === c) x.classList.add('ok'); }); if (!ok) b.classList.add('no');
      setTimeout(() => { i++; show(); }, 900);
    });
  };
  show();
}
function gTap(el){
  let t0 = 0, tm, st = 'idle'; el.innerHTML = '<div class="tap" id="tp">Tap to start</div><div class="msg" id="tr"></div>'; const tp = $('tp');
  tp.onclick = () => {
    if (st === 'idle'){ st = 'wait'; tp.className = 'tap w'; tp.textContent = 'Wait for lime...'; tm = setTimeout(() => { st = 'go'; tp.className = 'tap g'; tp.textContent = 'TAP!'; t0 = performance.now(); }, 1000 + Math.random() * 2500); }
    else if (st === 'wait'){ clearTimeout(tm); st = 'idle'; tp.className = 'tap'; tp.textContent = 'Too soon. Tap to try again'; }
    else { const ms = Math.round(performance.now() - t0); st = 'idle'; tp.className = 'tap'; tp.textContent = ms + ' ms. Tap to go again'; $('tr').textContent = setBest('tap', ms, true) ? 'New best!' : 'Best: ' + bestOf.tap + ' ms'; }
  };
}
const GAMES = [
  {id:'mem', n:'Memory Match', d:'Find all 8 pairs in the fewest moves.', i:'memory', c:'#4f8cff', run:gMem, f:v => v + ' moves'},
  {id:'quiz', n:'Music Quiz', d:'Six quick questions about music and radio.', i:'quiz', c:'#ff6fb1', run:gQuiz, f:v => v + ' / 6'},
  {id:'tap', n:'Reaction Wave', d:'Tap the moment the wave turns lime.', i:'reaction', c:'#4fe3c6', run:gTap, f:v => v + ' ms'}];
const gameCard = g => `<button class="gcard" data-game="${g.id}" style="background:${g.c};color:${onc(g.c)}"><span class="gi"><img src="assets/icons/games/${g.i}.svg" alt="" width="40" height="40"></span><b>${g.n}</b><em class="gk">${g.mp ? 'Multiplayer' : 'Solo'}</em><small>${g.d}</small><i>${bestOf[g.id] !== undefined ? 'Best: ' + g.f(bestOf[g.id]) : (g.nb ? 'Join a room' : 'Not played yet')}</i></button>`;
function renderGames(){ $('gg').innerHTML = GAMES.map(gameCard).join(''); if ($('hGames')) $('hGames').innerHTML = GAMES.map(gameCard).join(''); }
function openGame(id){ const g = GAMES.find(x => x.id === id); $('gT').textContent = g.n; $('gB').innerHTML = ''; g.run($('gB')); $('dGame').showModal(); }
