/* wave.radio · js/script.js · Connection status, account deletion and app start-up. */
/* ---- connection status + account deletion ---- */
function setNet(ok, msg){
  $('net').hidden = false; $('net').className = 'net' + (ok ? '' : ' bad'); $('net').textContent = ok ? 'Online' : 'Demo'; $('net').title = msg;
  $('banner').hidden = ok; $('banner').textContent = ok ? '' : msg;
}
async function ping(){
  if (!sb) return setNet(false, window.supabase ? 'Supabase isn’t configured, so this is demo mode. Stations and profiles stay on this device only.' : 'The Supabase library didn’t load, so this is demo mode and other devices can’t see your stations. Check your internet or ad blocker, then reload.');
  const r = await sb.from('stations').select('id', {count:'exact', head:true});
  setNet(!r.error, r.error ? 'Database problem: ' + r.error.message + '. Did you run the SQL files?' : '');
}
$('pDel').onclick = () => { $('dProf').close(); $('dU').textContent = user.username; $('dI').value = ''; $('dM').textContent = ''; $('dDel').showModal(); };
$('dGo').onclick = async () => {
  if ($('dI').value.trim().toLowerCase() !== user.username) return void ($('dM').textContent = 'That doesn’t match your username.');
  $('dM').textContent = 'Deleting...';
  if (sb){
    await endLive(); const r = await sb.rpc('delete_my_account');
    if (r.error) return void ($('dM').textContent = r.error.message + ' (run wave.radio-v5-upgrade.sql if you haven’t).');
    try { await sb.auth.signOut(); } catch(e){}
  } else { ls.set('wr_stn', ls.get('wr_stn', []).filter(x => x.owner !== 'demo')); }
  ls.set('wr_user', null); user = null; my = null; renderMe(); $('dDel').close(); go('real'); toast('Your account was deleted.');
};

/* ---- boot ---- */
(async () => {
  if (sb){ try { const r = await sb.auth.getSession(); if (r.data.session) await loadProfile(r.data.session.user); } catch(e){} }
  else if (user) my = await db.mine();
  renderGames(); renderMe(); loadReal(true); ping(); go('home');
  const om = location.hash.match(/^#open=([^&]+)&k=(\w+)/);   // opened from a push alert
  if (om){ history.replaceState(null, '', location.pathname); setTimeout(() => notifOpen({kind:om[2], link:decodeURIComponent(om[1])}), 900); }
})();
