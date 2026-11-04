/* wave.radio · js/morse.js · Morse code tools, Morse Guess (multiplayer) and Morse Chat (multiplayer). */
const MORSE = {A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.'};
const UNMORSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
const toMorse = t => String(t).toUpperCase().split(/\s+/).map(w => [...w].map(c => MORSE[c]).filter(Boolean).join(' ')).filter(Boolean).join(' / ');
const fromMorse = m => String(m).split(' / ').map(w => w.trim().split(' ').map(c => UNMORSE[c] || '').join('')).join(' ').trim();
const morseHTML = m => esc(m).replace(/\./g, '·').replace(/-/g, '−').replace(/ \/ /g, '   /   ');
const cleanMorse = m => String(m).replace(/[^.\-\/ ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 400);
const MZ = {ctx:null};
function playMorse(m){
  const c = MZ.ctx || (MZ.ctx = new (window.AudioContext || window.webkitAudioContext)()); c.resume();
  const u = .07; let t = c.currentTime + .05;
  for (const ch of m){
    if (ch === '.' || ch === '-'){
      const d = ch === '.' ? u : u * 3, o = c.createOscillator(), g = c.createGain(); o.frequency.value = 620;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.25, t + .008); g.gain.setValueAtTime(.25, t + d - .01); g.gain.linearRampToValueAtTime(0, t + d);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + .02); t += d + u;
    } else if (ch === ' ') t += u * 2; else if (ch === '/') t += u * 3;
  }
}
document.addEventListener('click', e => { const b = e.target.closest('[data-pm]'); if (b) playMorse(b.dataset.pm); });

/* ---- Morse Guess ---- */
function guessStart(el, p){
  const r = mpRng(p ? p.seed : Math.random() * 1e9), N = 8, L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const rounds = Array.from({length:N}, () => { const c = L[r() * 26 | 0], o = new Set([c]); while (o.size < 4) o.add(L[r() * 26 | 0]); return {c, o:mpShuffle([...o], r)}; });
  let i = 0, score = 0, ms = 0, t0 = 0, lock = false;
  const rank = (a, b) => b.score - a.score || a.ms - b.ms, fmt = x => x.score + ' pts' + (x.done ? '' : ' · round ' + (x.round + 1));
  const show = () => {
    const q = rounds[i]; lock = false;
    el.innerHTML = `<div class="msg">Round ${i + 1} of ${N} · ${score} pts</div><div class="morse" aria-label="Morse code">${morseHTML(MORSE[q.c])}</div>
      <button class="btn ghost sm" id="gh">Hear it</button><p class="msg">Which letter is this?</p>
      <div class="opts">${q.o.map(l => `<button class="opt" data-l="${l}">${l}</button>`).join('')}</div><div id="mpB"></div>`;
    $('gh').onclick = () => playMorse(MORSE[q.c]); playMorse(MORSE[q.c]); t0 = performance.now();
    MP.onBoard = () => { const b = $('mpB'); if (b) b.innerHTML = MP.ch ? mpBoardHTML(rank, fmt) : ''; }; MP.onBoard();
    el.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      if (lock) return; lock = true; const t = performance.now() - t0, ok = b.dataset.l === q.c; ms += t;
      if (ok){ score += Math.max(20, 100 - Math.floor(t / 150)); b.classList.add('ok'); }
      else { b.classList.add('no'); el.querySelectorAll('.opt').forEach(x => { if (x.dataset.l === q.c) x.classList.add('ok'); }); }
      i++; mpProg({score, ms:Math.round(ms), round:i, done:i >= N});
      setTimeout(() => i >= N ? finish() : show(), 900);
    });
  };
  const finish = () => { const nb = setBest('morse', score); mpEnd(el, `You scored ${score} pts${nb ? ' · new best!' : ''}`, rank, fmt); };
  show();
}
addMP({id:'morse', n:'Morse Guess', d:'Decode the dots and dashes. Eight rounds, faster answers score more. Race friends in a room.', i:'morse', c:'#ffbf47', start:guessStart, f:v => v + ' pts'});

/* ---- Morse Chat ---- */
function morseChat(el){
  mpLeave(); MP.def = {id:'mchat', n:'Morse Chat', d:'', run:morseChat};
  el.innerHTML = `<p class="msg">Chat in dots and dashes. Pick a room name and share it with friends.</p>
    <label for="mcR">Room</label><div class="two"><input id="mcR" maxlength="12" value="LOBBY" style="text-transform:uppercase" autocomplete="off"><button class="btn fit" id="mcJ">Join</button></div>`;
  $('mcJ').onclick = () => mcEnter(el, ($('mcR').value || 'LOBBY').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'LOBBY');
}
function mcEnter(el, room){
  const msgs = []; let keyed = '', last = 0, ch = null;
  if (sb){ ch = MP.ch = sb.channel('morse:' + room, {config:{broadcast:{self:true}, presence:{key:MP.id}}}); }
  el.innerHTML = `<div class="msg">Room <b>${esc(room)}</b> · <span id="mcC">1</span> online${sb ? '' : ' (offline, only you)'}</div>
    <label class="tog" style="margin:8px 0"><input type="checkbox" id="mcA"><span>Play incoming messages as sound</span></label>
    <div class="chat" id="mcL"></div>
    <div class="two" style="margin-top:10px"><input id="mcT" maxlength="100" placeholder="Type a message" autocomplete="off"><button class="btn fit" id="mcS">Send</button></div>
    <div class="keyr"><div class="msg">Or tap out the morse yourself:</div>
      <div class="ctl"><button class="opt k" id="kd">· dot</button><button class="opt k" id="kh">− dash</button><button class="opt k" id="ks">letter gap</button><button class="opt k" id="kb">Delete</button></div>
      <div class="morse" id="kp" style="font-size:28px;min-height:56px"></div><div class="msg" id="kx"></div><button class="btn ghost sm" id="kS" style="margin-top:8px">Send morse</button></div>`;
  const draw = () => {
    $('mcL').innerHTML = msgs.length ? msgs.map(x => `<p class="${x.id === MP.id ? 'me' : ''}"><i>${esc(x.name)}</i><span class="mz">${morseHTML(x.m)}</span><b>${esc(fromMorse(x.m))}</b><button class="pm" data-pm="${esc(x.m)}" aria-label="Play">Play</button></p>`).join('') : '<div class="msg">No messages yet. Say something in Morse.</div>';
    $('mcL').scrollTop = 1e9;
  };
  const send = m => {
    m = cleanMorse(m); if (!m || Date.now() - last < 800) return; last = Date.now();
    const p = {id:MP.id, name:mpName(), m};
    if (ch) ch.send({type:'broadcast', event:'msg', payload:p}); else { msgs.push(p); draw(); }
  };
  if (ch){
    ch.on('broadcast', {event:'msg'}, ({payload:x}) => { x = {id:String(x.id), name:String(x.name).slice(0, 30), m:cleanMorse(x.m)}; msgs.push(x); if (msgs.length > 50) msgs.shift(); draw(); if (x.id !== MP.id && $('mcA') && $('mcA').checked) playMorse(x.m); });
    ch.on('presence', {event:'sync'}, () => { const n = Object.keys(ch.presenceState()).length; if ($('mcC')) $('mcC').textContent = n || 1; });
    ch.subscribe(async st => { if (st === 'SUBSCRIBED') await ch.track({name:mpName(), t:Date.now()}); });
  }
  const showKey = () => { $('kp').textContent = keyed.trim() ? keyed.replace(/\./g, '·').replace(/-/g, '−') : ' '; $('kx').textContent = keyed.trim() ? '→ ' + fromMorse(keyed.trim().replace(/[\s/]+$/, '')) : ''; };
  $('kd').onclick = () => { keyed += '.'; showKey(); playMorse('.'); };
  $('kh').onclick = () => { keyed += '-'; showKey(); playMorse('-'); };
  $('ks').onclick = () => { keyed = keyed.endsWith(' ') ? keyed.replace(/ $/, ' / ') : keyed + ' '; showKey(); };
  $('kb').onclick = () => { keyed = keyed.replace(/( \/ | |.)$/, ''); showKey(); };
  $('kS').onclick = () => { send(keyed.trim().replace(/[\s/]+$/, '')); keyed = ''; showKey(); };
  const sendText = () => { const m = toMorse($('mcT').value); if (!m) return toast('Use letters and numbers.'); send(m); $('mcT').value = ''; };
  $('mcS').onclick = sendText; $('mcT').onkeydown = e => { if (e.key === 'Enter') sendText(); };
  draw(); showKey();
}
addMP({id:'mchat', n:'Morse Chat', d:'Chat in Morse code with anyone in a room.', i:'chat', c:'#c8f54b', nb:true, run:morseChat, start:null, f:() => ''});
