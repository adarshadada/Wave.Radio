/* wave.radio · js/player.js · Tabs and navigation, audio player, live-broadcast listener. */
/* ---- tabs ---- */
const GROUPS = {home:['home'], listen:['real','comm'], games:['games'], social:['rooms','people'], studio:['studio']};
const SUBN = {real:'Real FM', comm:'Community', rooms:'Rooms', people:'People'}, lastSub = {listen:'real', social:'rooms'};
const grpOf = t => Object.keys(GROUPS).find(k => GROUPS[k].includes(t));
function go(t){
  tab = t;
  document.querySelectorAll('.tab').forEach(e => e.classList.toggle('on', e.id === 't-' + t));
  const g = grpOf(t); if (g in lastSub) lastSub[g] = t;
  document.querySelectorAll('#seg button').forEach(b => b.classList.toggle('on', b.dataset.g === g));
  $('sub').hidden = GROUPS[g].length < 2;
  $('sub').innerHTML = GROUPS[g].length < 2 ? '' : GROUPS[g].map(x => `<button data-t="${x}" class="${x === t ? 'on' : ''}">${SUBN[x]}</button>`).join('');
  if (t === 'real' && !realLoaded) loadReal(true);
  if (t === 'comm') loadComm(true);
  if (t === 'home') loadHome();
  fillAds();
  if (t === 'rooms') renderRooms();
  if (t === 'people') loadPeople(true);
  if (t === 'studio') renderStudio();
  window.scrollTo({top:0});
}
document.querySelectorAll('#seg button').forEach(b => b.onclick = () => go(lastSub[b.dataset.g] || GROUPS[b.dataset.g][0]));
$('sub').onclick = e => { const b = e.target.closest('button'); if (b) go(b.dataset.t); };
document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go); const m = e.target.closest('[data-game]'); if (m) openGame(m.dataset.game); });
$('goStudio').onclick = () => go('studio');
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('dialog').close());

/* ---- player ---- */
let P = null, LS = null;
const RTC = {iceServers:[{urls:'stun:stun.l.google.com:19302'},
  {urls:['turn:openrelay.metered.ca:80','turn:openrelay.metered.ca:443','turns:openrelay.metered.ca:443?transport=tcp'], username:'openrelayproject', credential:'openrelayproject'}]}; // free shared relay; use your own TURN for production
function showPlayer(p){
  P = p; $('pl').classList.add('on'); $('pArt').innerHTML = pic(p.img, 'a');
  $('pT').textContent = p.name; $('pS').textContent = p.sub; $('pChat').hidden = p.kind !== 'comm'; setPlayIcon(true); refreshVote();
  document.querySelectorAll('.card').forEach(c => c.classList.toggle('on', c.dataset.id === p.id));
}
function playUrl(p, url){
  stopListen(); au.srcObject = null; showPlayer(p); au.src = url; toast('Connecting to ' + p.name + '...');
  au.play().then(() => toast('')).catch(() => toast('This station won’t play right now. Try another one.'));
}
au.onplaying = () => $('pl').classList.add('playing');
au.onpause = au.onended = () => $('pl').classList.remove('playing');
au.onerror = () => { if (P && !au.srcObject) toast(P.name + ' is offline. Try another one.'); };
$('pBtn').onclick = () => { if (au.paused){ au.play(); setPlayIcon(true); } else { au.pause(); setPlayIcon(false); } };
$('pX').onclick = () => { au.pause(); au.removeAttribute('src'); au.srcObject = null; stopListen(); P = null; $('pl').classList.remove('on'); document.querySelectorAll('.card.on').forEach(c => c.classList.remove('on')); };
$('pChat').onclick = () => P && openChat('station:' + P.id, P.name, 'Station chat');

/* ---- listener side of a browser broadcast (WebRTC, signalled through Supabase Realtime) ---- */
const addIce = (pc, q, c) => pc.remoteDescription ? pc.addIceCandidate(c).catch(() => {}) : q.push(c);
const flush = (pc, q) => { q.splice(0).forEach(c => pc.addIceCandidate(c).catch(() => {})); };
function stopListen(){ if (LS){ try { LS.pc.close(); } catch(e){} if (sb) sb.removeChannel(LS.ch); LS = null; } }
function listenLive(s, p){
  stopListen(); au.pause(); au.removeAttribute('src'); showPlayer(p);
  if (!sb || !s.is_live){ toast(s.name + ' isn’t live right now.'); setPlayIcon(false); return; }
  const me = Math.random().toString(36).slice(2), ch = sb.channel('live:' + s.id), pc = new RTCPeerConnection(RTC), q = [];
  LS = {ch, pc, id:me}; toast('Tuning in...');
  const send = (event, payload) => ch.send({type:'broadcast', event, payload});
  pc.ontrack = e => { au.srcObject = e.streams[0]; au.play().then(() => toast('')).catch(() => { setPlayIcon(false); toast('Connected. Tap play to hear the broadcast.'); }); };
  pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') toast('Couldn’t connect to the broadcast. Your network may be blocking live audio.'); };
  pc.onicecandidate = e => e.candidate && send('ice', {to:'host', peer:me, c:e.candidate});
  ch.on('broadcast', {event:'offer'}, async ({payload:x}) => {
    if (x.to !== me) return; await pc.setRemoteDescription(x.sdp); flush(pc, q);
    const a = await pc.createAnswer(); await pc.setLocalDescription(a); send('answer', {to:'host', peer:me, sdp:a});
  });
  ch.on('broadcast', {event:'ice'}, ({payload:x}) => { if (x.to === me) addIce(pc, q, x.c); });
  ch.on('broadcast', {event:'end'}, () => { au.srcObject = null; toast('The broadcast ended.'); });
  ch.subscribe(st => { if (st === 'SUBSCRIBED') send('join', {peer:me}); });
  setTimeout(() => { if (LS && LS.id === me && !au.srcObject) toast('The host isn’t responding. They may have just left.'); }, 9000);
}
