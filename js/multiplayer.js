/* wave.radio · js/multiplayer.js · Multiplayer rooms for games.
   Uses Supabase Realtime (broadcast + presence). No database tables needed. Solo mode works offline. */
const MP = {ch:null, code:'', def:null, id:Math.random().toString(36).slice(2, 8), board:{}, players:{}, playing:false, onBoard:null};
const mpName = () => user ? who(user) : 'Guest-' + MP.id.slice(0, 3);
const mpCode = () => Array.from({length:4}, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random() * 24 | 0]).join('');
function mpRng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mpShuffle(a, r){ a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = r() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
function mpLeave(){ if (MP.ch && sb) sb.removeChannel(MP.ch); MP.ch = null; MP.board = {}; MP.players = {}; MP.playing = false; MP.onBoard = null; if (window.hamStop) window.hamStop(); }
function addMP(def){ def.mp = true; if (!def.run) def.run = el => mpLobby(def, el); GAMES.push(def); }

function mpLobby(def, el){
  mpLeave(); MP.def = def;
  el.innerHTML = `<p class="msg">${esc(def.d)}</p>
    <div class="ctl"><button class="btn" id="mpSolo">Play solo</button><button class="btn ghost" id="mpNew">Create room</button></div>
    <label for="mpC">Join a friend with their room code</label>
    <div class="two"><input id="mpC" maxlength="4" placeholder="ABCD" style="text-transform:uppercase" autocomplete="off"><button class="btn fit" id="mpJoin">Join</button></div><div class="msg" id="mpM"></div>`;
  $('mpSolo').onclick = () => { MP.board = {}; def.start(el, null); };
  $('mpNew').onclick = () => mpEnter(def, el, mpCode());
  $('mpJoin').onclick = () => { const c = $('mpC').value.trim().toUpperCase(); if (c.length !== 4) return void ($('mpM').textContent = 'Enter the 4-letter code.'); mpEnter(def, el, c); };
}
function mpEnter(def, el, code){
  if (!sb) return toast('Multiplayer needs the online database connected. Solo still works.');
  mpLeave(); MP.def = def; MP.code = code;
  const ch = MP.ch = sb.channel(`game:${def.id}:${code}`, {config:{presence:{key:MP.id}, broadcast:{self:true}}});
  ch.on('presence', {event:'sync'}, () => { MP.players = ch.presenceState(); if (!MP.playing) lobbyDraw(el); });
  ch.on('broadcast', {event:'start'}, ({payload}) => { MP.playing = true; MP.board = {}; def.start(el, payload); });
  ch.on('broadcast', {event:'prog'}, ({payload}) => { MP.board[payload.id] = payload; if (MP.onBoard) MP.onBoard(); });
  ch.subscribe(async st => { if (st === 'SUBSCRIBED') await ch.track({name:mpName(), t:Date.now()}); });
  lobbyDraw(el);
}
function lobbyDraw(el){
  const ps = Object.entries(MP.players).map(([k, v]) => ({id:k, ...v[0]})).sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1));
  const host = ps[0] && ps[0].id === MP.id;
  el.innerHTML = `<div class="room"><small>Room code</small><b>${esc(MP.code)}</b></div>
    <p class="msg">Share this code with friends. ${ps.length || 1} player${ps.length === 1 ? '' : 's'} here.</p>
    <div class="plist">${ps.map((p, i) => `<span class="pl">${esc(p.name)}${i === 0 ? ' (host)' : ''}</span>`).join('')}</div>
    ${host ? '<button class="btn" id="mpGo" style="margin-top:14px;width:100%">Start game</button>' : '<p class="msg">Waiting for the host to start...</p>'}
    <div class="acts"><button class="btn ghost" id="mpX">Leave room</button></div>`;
  if (host) $('mpGo').onclick = () => MP.ch.send({type:'broadcast', event:'start', payload:{seed:Math.floor(Math.random() * 1e9)}});
  $('mpX').onclick = () => mpLobby(MP.def, el);
}
function mpProg(o){
  const m = Object.assign({id:MP.id, name:mpName()}, o); MP.board[MP.id] = m;
  if (MP.ch) MP.ch.send({type:'broadcast', event:'prog', payload:m}); if (MP.onBoard) MP.onBoard();
}
function mpBoardHTML(rank, fmt){
  const a = Object.values(MP.board).sort(rank);
  return a.length ? '<div class="bd">' + a.map((p, k) => `<div class="br"><b>${k + 1}</b><span>${esc(p.name)}${p.id === MP.id ? ' (you)' : ''}</span><i>${esc(fmt(p))}</i></div>`).join('') + '</div>' : '';
}
function mpEnd(el, text, rank, fmt){
  el.innerHTML = `<h3 class="disp">${esc(text)}</h3><div id="mpB"></div><div class="acts"><button class="btn ghost" id="mpBack">${MP.ch ? 'Back to lobby' : 'Back'}</button></div>`;
  MP.onBoard = () => { const b = $('mpB'); if (b) b.innerHTML = MP.ch ? mpBoardHTML(rank, fmt) : ''; }; MP.onBoard();
  $('mpBack').onclick = () => { if (MP.ch){ MP.playing = false; MP.board = {}; lobbyDraw(el); } else mpLobby(MP.def, el); };
}
$('dGame').addEventListener('close', mpLeave);
