/* wave.radio · js/studio.js · Studio: audio files + microphone broadcasting. */
/* ---- Studio: broadcast from the browser with audio files + microphone ---- */
const L = {q:[], i:-1, loop:false, on:false, peers:{}, mic:null};
function eng(){
  if (L.ctx) return;
  L.ctx = new (window.AudioContext || window.webkitAudioContext)(); L.dest = L.ctx.createMediaStreamDestination();
  L.fg = L.ctx.createGain(); L.mg = L.ctx.createGain(); L.fg.connect(L.dest); L.mon = L.ctx.createGain(); L.mon.gain.value = L.mute ? 0 : 1; L.fg.connect(L.mon); L.mon.connect(L.ctx.destination); L.mg.connect(L.dest);
  L.el = new Audio(); L.el.onended = nextTrack; L.ctx.createMediaElementSource(L.el).connect(L.fg);
}
async function playTrack(i){ eng(); await L.ctx.resume(); L.i = i; L.el.src = L.q[i].url; await L.el.play(); renderStudio(); }
function nextTrack(){ if (!L.q.length) return; let n = L.i + 1; if (n >= L.q.length){ if (!L.loop){ L.i = -1; return renderStudio(); } n = 0; } playTrack(n); }
async function toggleMic(){
  eng(); await L.ctx.resume();
  if (L.mic){ L.mic.getTracks().forEach(t => t.stop()); L.msrc.disconnect(); L.mic = null; }
  else try { L.mic = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true}}); L.msrc = L.ctx.createMediaStreamSource(L.mic); L.msrc.connect(L.mg); }
  catch(e){ toast('Couldn’t reach the microphone. Allow access in your browser and try again.'); }
  renderStudio();
}
const cnt = () => { const e = $('lc'); if (e) e.textContent = Object.values(L.peers).filter(p => p.pc.connectionState === 'connected').length + ' listening'; };
async function goLive(){
  if (!sb) return toast('Going live for other people needs Supabase connected.');
  eng(); await L.ctx.resume();
  const ch = L.ch = sb.channel('live:' + my.id), send = (event, payload) => ch.send({type:'broadcast', event, payload});
  ch.on('broadcast', {event:'join'}, async ({payload:x}) => {
    const pc = new RTCPeerConnection(RTC), q = []; L.peers[x.peer] = {pc, q};
    L.dest.stream.getAudioTracks().forEach(t => pc.addTrack(t, L.dest.stream));
    pc.onicecandidate = e => e.candidate && send('ice', {to:x.peer, c:e.candidate});
    pc.onconnectionstatechange = () => { if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)){ pc.close(); delete L.peers[x.peer]; } cnt(); };
    const o = await pc.createOffer(); await pc.setLocalDescription(o); send('offer', {to:x.peer, sdp:o});
  });
  ch.on('broadcast', {event:'answer'}, async ({payload:x}) => { const p = L.peers[x.peer]; if (p){ await p.pc.setRemoteDescription(x.sdp); flush(p.pc, p.q); } });
  ch.on('broadcast', {event:'ice'}, ({payload:x}) => { const p = L.peers[x.peer]; if (x.to === 'host' && p) addIce(p.pc, p.q, x.c); });
  ch.on('broadcast', {event:'admin-cut'}, () => checkCut()); L.since = Date.now(); const err = await db.setLive(true); if (err) return toast('Couldn’t go live: ' + err.message + '. Run wave.radio-v5-upgrade.sql if you haven’t.'); ch.subscribe(); L.hb = setInterval(async () => { if (!(await checkCut())) db.setLive(true); }, 30000); L.on = true; renderStudio(); toast('You’re on air. Listeners can tune in from the Community tab.');
}
async function checkCut(){
  if (!L.on || !sb || !my) return false;
  const c = ((await sb.from('stations').select('cut_at').eq('id', my.id).maybeSingle()).data || {}).cut_at;
  if (c && new Date(c).getTime() > L.since - 2000){ await endLive(); toast('An admin ended your broadcast.'); return true; }
  return false;
}
async function endLive(){
  if (!L.on) return; L.on = false; clearInterval(L.hb);
  try { L.ch.send({type:'broadcast', event:'end', payload:{}}); } catch(e){}
  Object.values(L.peers).forEach(p => p.pc.close()); L.peers = {}; if (L.ch && sb) sb.removeChannel(L.ch);
  await db.setLive(false); if (tab === 'studio') renderStudio();
}
addEventListener('pagehide', e => { if (!e.persisted && L.on && sb) sb.from('stations').update({is_live:false}).eq('id', my.id); });
function renderStudio(){
  const el = $('sd');
  if (!user) return void (el.innerHTML = '<div class="empty">Sign in to start your own station. You get a unique wave tag, a profile, and a studio to broadcast from.<br><br><button class="btn" id="si">Sign in</button></div>', $('si').onclick = () => openAuth('in'));
  if (!my) return void (el.innerHTML = '<div class="sh"><h2>Studio</h2></div><div class="empty">You don’t have a station yet. Pick a name, a wave tag like <b>wmz/ember-fox</b>, a logo and colours, then broadcast from your browser or connect an external stream.<br><br><button class="btn" id="mk1">Start your station</button></div>', $('mk1').onclick = openStation);
  const live = my.mode === 'live';
  el.innerHTML = `<div class="studio"><div class="ban">${pic(my.banner_url, 'b')}</div><div class="in">
    <div class="lg">${pic(my.logo_url, 'a')}</div>
    <div class="sh" style="margin-top:10px"><div style="flex:1"><h2 style="font-size:26px">${esc(my.name)}${L.on ? '<em class="live">LIVE</em>' : ''}</h2><span class="tag" style="background:${esc(my.accent)};color:${onc(my.accent)}">wmz/${esc(my.tag)}</span></div><button class="btn ghost sm" id="ed">Edit station</button></div>
    ${live ? `
    <div class="onbar ${L.on ? '' : 'off'}"><span class="dot"></span><b>${L.on ? 'You’re on air' : 'Off air'}</b><span id="lc">${Object.values(L.peers).filter(p => p.pc.connectionState === 'connected').length} listening</span><button class="btn sm" id="gl">${L.on ? 'End broadcast' : 'Go live'}</button></div>
    <label class="tog"><input type="checkbox" id="mm" ${L.mute ? 'checked' : ''}><span>Play to listeners, mute on this device<small>Your songs still go out to everyone tuned in, but your own speakers stay silent. Your microphone is never played back to you.</small></span></label>
    <div class="panel"><h3>How it works <small style="color:var(--mute);font-weight:400">· app v6</small></h3>
      
      <div class="msg">Listeners hear whatever you play below plus your microphone. Browser broadcasts suit small audiences, so use an external stream for large ones.</div></div>
    <div class="panel"><h3>Microphone</h3><div class="ctl"><button class="btn ${L.mic ? '' : 'ghost'} sm" id="mc">${L.mic ? 'Mic on' : 'Mic off'}</button>
      <label style="margin:0;display:flex;gap:8px;align-items:center;flex:1">Volume <input type="range" id="mv" min="0" max="2" step=".05" value="${L.mg ? L.mg.gain.value : 1}"></label></div></div>
    <div class="panel"><h3>Audio files</h3><div class="ctl"><button class="btn ghost sm" id="ab">Add audio files</button><input type="file" id="af" class="vh" tabindex="-1" aria-hidden="true" accept="audio/*,video/mp4,.mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac,.weba,.webm" multiple>
      <label style="margin:0;display:flex;gap:6px;align-items:center"><input type="checkbox" id="lp" ${L.loop ? 'checked' : ''}>Loop playlist</label>
      <label style="margin:0;display:flex;gap:8px;align-items:center;flex:1">Level <input type="range" id="fv" min="0" max="1.5" step=".05" value="${L.fg ? L.fg.gain.value : 1}"></label></div>
      ${L.q.length ? L.q.map((t, i) => `<div class="q"><span>${i === L.i ? 'Now playing: ' : ''}${esc(t.name)}</span><button class="btn ghost sm" data-p="${i}">${i === L.i ? 'Restart' : 'Play'}</button><button class="btn ghost sm" data-d="${i}">Remove</button></div>`).join('') : '<div class="msg">No files yet. Add MP3, WAV, AAC, OGG or any audio your browser can play.</div>'}
      ${L.q.length ? `<div class="ctl"><button class="btn ghost sm" id="pp">${L.el && !L.el.paused ? 'Pause' : 'Resume'}</button><button class="btn ghost sm" id="nx">Next</button></div>` : ''}</div>`
    : `<div class="panel"><h3>External stream</h3><div class="msg">Listeners hear <b>${esc(my.stream_url)}</b> when they open your station. Go live is only for browser broadcasts: choose “Edit station” and set the source to “From my browser” to use audio files and your microphone.</div><div class="ctl"><button class="btn" id="tolive">Broadcast from my browser instead</button></div></div>`}
  </div></div>`;
  $('ed').onclick = openStation;
  if (!live){ $('tolive').onclick = async () => { try { my = await db.save({mode:'live'}); renderStudio(); toast('Switched. Press Go live to start.'); } catch(e){ toast(e.message); } }; return; }
  $('gl').onclick = () => L.on ? endLive() : goLive(); $('mc').onclick = toggleMic;
  $('mm').onchange = e => { eng(); L.mute = e.target.checked; L.mon.gain.value = L.mute ? 0 : 1; };
  $('mv').oninput = e => { eng(); L.mg.gain.value = +e.target.value; }; $('fv').oninput = e => { eng(); L.fg.gain.value = +e.target.value; };
  $('lp').onchange = e => L.loop = e.target.checked;
  $('ab').onclick = () => $('af').click();
  $('af').onchange = e => {
    const ok = [...e.target.files].filter(f => /^(audio|video\/mp4)/.test(f.type) || /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|weba|webm|mp4)$/i.test(f.name));
    ok.forEach(f => L.q.push({name:f.name, url:URL.createObjectURL(f)}));
    toast(ok.length ? 'Added ' + ok.length + (ok.length > 1 ? ' files' : ' file') : 'Those files aren’t audio. Try MP3, M4A, WAV or OGG.');
    renderStudio();
  };
  el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => playTrack(+b.dataset.p));
  el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const i = +b.dataset.d; if (i === L.i){ L.el.pause(); L.i = -1; } else if (i < L.i) L.i--; L.q.splice(i, 1); renderStudio(); });
  if ($('pp')) $('pp').onclick = async () => { eng(); await L.ctx.resume(); if (L.i < 0) return playTrack(0); L.el.paused ? L.el.play() : L.el.pause(); setTimeout(renderStudio, 100); };
  if ($('nx')) $('nx').onclick = nextTrack;
}
