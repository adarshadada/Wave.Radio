/* wave.radio · js/notifications.js · In-app notifications: new chat messages, stations going live, friend requests, notes from admins.
   Delivered live through Supabase Realtime while the app is open. */
const NT = {ch:null, uid:null, items:[]};
const NK = {chat:'Chat', live:'Live', friend:'Friends', admin:'Admin'};
const ago = t => { const m = Math.round((Date.now() - new Date(t)) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };

function notifBadge(){ const n = NT.items.filter(x => !x.read).length; $('bellN').hidden = !n; $('bellN').textContent = n > 9 ? '9+' : n; }
function notifSync(){
  const on = !!(sb && user && user.id !== 'demo');
  $('bell').hidden = !on;
  if (!on){ if (NT.ch){ sb.removeChannel(NT.ch); NT.ch = null; } NT.uid = null; NT.items = []; notifBadge(); return; }
  if (NT.uid === user.id) return;
  NT.uid = user.id; if (NT.ch) sb.removeChannel(NT.ch);
  notifLoad(); if (window.pushEnable && (PUSH.native || (window.Notification && Notification.permission === 'granted'))) pushEnable(true);
  NT.ch = sb.channel('notif-' + user.id).on('postgres_changes', {event:'*', schema:'public', table:'notifications', filter:'user_id=eq.' + user.id}, onNotif).subscribe();
}
async function notifLoad(){
  const r = await sb.from('notifications').select('*').order('created_at', {ascending:false}).limit(40);
  if (r.error) return; NT.items = r.data || []; notifBadge(); if ($('dNotif').open) notifDraw();
}
function onNotif(p){
  const n = p.new; if (!n || !n.id) return;
  const old = NT.items.find(x => x.id === n.id), fresh = p.eventType === 'INSERT' || (!n.read && (!old || old.created_at !== n.created_at));
  NT.items = [n].concat(NT.items.filter(x => x.id !== n.id)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 40);
  notifBadge(); if ($('dNotif').open) notifDraw(); if (fresh && !n.read) notifAlert(n);
}
function notifAlert(n){
  if (n.kind === 'chat' && n.link === chName && $('dChat').open) return void notifRead([n.id]);
  toast(n.title + (n.body ? ': ' + n.body : '')); if (navigator.vibrate) navigator.vibrate(60);
  if (window.Notification && Notification.permission === 'granted' && document.hidden){ try { new Notification(n.title, {body:n.body || '', icon:'assets/icon-192.png', tag:'wr-' + n.id}); } catch(e){} }
}
async function notifRead(ids){
  ids = ids.filter(Boolean); if (!ids.length) return;
  NT.items.forEach(x => { if (ids.includes(x.id)) x.read = true; }); notifBadge(); if ($('dNotif').open) notifDraw();
  await sb.from('notifications').update({read:true}).in('id', ids);
}
function notifDraw(){
  $('nL').innerHTML = NT.items.length
    ? NT.items.map(n => `<button class="nrow ${n.read ? '' : 'un'}" data-n="${n.id}"><b><span class="nk">${NK[n.kind] || 'Info'}</span>${esc(n.title)}${n.count > 1 ? ' (' + n.count + ')' : ''}</b><span>${esc(n.body || '')}</span><small>${ago(n.created_at)}</small></button>`).join('')
    : '<div class="empty">Nothing yet. New chat messages, friends going live and notes from the team show up here.</div>';
  $('nDev').hidden = PUSH.native ? !!PUSH.token : !(window.Notification && (Notification.permission === 'default' || (PUSH.on && Notification.permission === 'granted' && !PUSH.token)));
}
async function notifOpen(n){
  $('dNotif').close(); const l = n.link || '';
  if (/^(home|comm|real|rooms|people|games|studio)$/.test(l)) return go(l);
  const m = l.match(/^(station|room):([0-9a-f-]{36})$/); if (!m) return;
  if (m[1] === 'station'){
    const s = (await sb.from('stations').select('*').eq('id', m[2]).maybeSingle()).data; if (!s) return toast('That station no longer exists.');
    window.CS = window.CS || {}; window.CS[s.id] = s;
    if (n.kind === 'live') playComm(s); else openChat('station:' + s.id, s.name, 'Station chat');
  } else {
    const r = (await sb.from('rooms').select('*').eq('id', m[2]).maybeSingle()).data; if (!r) return toast('That room no longer exists.');
    openChat('room:' + r.id, r.name, r.topic || 'Open room');
  }
}
$('bell').onclick = () => { notifDraw(); $('dNotif').showModal(); };
$('nAll').onclick = () => notifRead(NT.items.filter(x => !x.read).map(x => x.id));
$('nL').onclick = e => { const b = e.target.closest('[data-n]'); if (!b) return; const n = NT.items.find(x => x.id === +b.dataset.n); if (!n) return; notifRead([n.id]); notifOpen(n); };
$('nDev').onclick = async () => { if (PUSH.on) await pushEnable(false); else { try { const p = await Notification.requestPermission(); toast(p === 'granted' ? 'Alerts are on while the app is open.' : 'Alerts stay off.'); } catch(e){} } notifDraw(); };
