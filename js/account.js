/* wave.radio · js/account.js · Sign in, profile, station create/edit. */
/* ---- auth + profile ---- */
let mode = 'in';
function renderMe(){
  $('me').className = 'me' + (user ? '' : ' out');
  $('me').innerHTML = user ? `<span class="mark">${user.avatar_url ? `<img src="${esc(user.avatar_url)}" alt="" onerror="this.outerHTML=LOGO">` : LOGO}</span>${esc(who(user))}` : 'Sign in';
  accent(user && user.accent); if (window.notifSync) notifSync();
}
const need = () => user ? true : (openAuth('in'), false);
function openAuth(m){
  mode = m; const up = m === 'up';
  $('aT').textContent = $('aGo').textContent = up ? 'Create account' : 'Sign in';
  $('aSwap').textContent = up ? 'I have an account' : 'Create account';
  $('aDemo').hidden = !!sb; $('aAux').hidden = !sb; $('aCode').hidden = true; $('aNew').hidden = true; $('aMail').hidden = !sb; $('aName').hidden = !(up || !sb); $('aM').textContent = ''; $('dAuth').showModal();
}
$('aSwap').onclick = () => openAuth(mode === 'in' ? 'up' : 'in');
const RED = /^https?:/.test(location.href) ? location.href.split(/[?#]/)[0] : undefined;
let codeType = 'signup';
function askCode(type, msg){ codeType = type; $('aCode').hidden = false; $('aM').textContent = msg; $('aK').value = ''; $('aK').focus(); }
$('aVerify').onclick = async () => {
  const email = $('aE').value.trim(), token = $('aK').value.trim();
  if (!email || !token) return void ($('aM').textContent = 'Enter your email and the code.');
  $('aM').textContent = 'Checking...';
  const r = await sb.auth.verifyOtp({email, token, type:codeType});
  if (r.error) return void ($('aM').textContent = /expired|invalid/i.test(r.error.message) ? 'That code is wrong or expired. Request a new one.' : r.error.message);
  if (codeType === 'recovery'){ $('aCode').hidden = true; $('aNew').hidden = false; $('aM').textContent = 'Code accepted. Choose a new password.'; return; }
  await loadProfile(r.data.user); $('dAuth').close(); toast('You’re in. Welcome to wave.radio.');
};
$('aSetPw').onclick = async () => {
  const pw = $('aNP').value; if (pw.length < 6) return void ($('aM').textContent = 'Use at least 6 characters.');
  const u = await sb.auth.updateUser({password:pw}); if (u.error) return void ($('aM').textContent = u.error.message);
  const ss = (await sb.auth.getSession()).data.session; if (ss) await loadProfile(ss.user); $('dAuth').close(); toast('Password updated. You’re signed in.');
};
const mailErr = m => /rate limit|seconds|too many/i.test(m) ? 'Too many emails requested. Wait a minute and try again.' : /sending (confirmation|recovery|email|magic)/i.test(m) ? 'Supabase couldn’t send the email. Check your SMTP settings (Gmail app password with no spaces, port 587).' : m;
$('aForgot').onclick = async () => {
  const email = $('aE').value.trim(); if (!email) return void ($('aM').textContent = 'Enter your email above first.');
  const r = await sb.auth.resetPasswordForEmail(email, {redirectTo:RED}); if (r.error) $('aM').textContent = mailErr(r.error.message); else askCode('recovery', 'We emailed you a code. Enter it below, then choose a new password.');
};
$('aResend').onclick = async () => {
  const email = $('aE').value.trim(); if (!email) return void ($('aM').textContent = 'Enter your email above first.');
  const r = await sb.auth.resend({type:'signup', email, options:{emailRedirectTo:RED}}); if (r.error) $('aM').textContent = mailErr(r.error.message); else askCode('signup', 'Sent again. Enter the new code below.');
};
if (sb) sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY'){ const pw = prompt('Choose a new password (6+ characters)'); if (pw && pw.length >= 6) sb.auth.updateUser({password:pw}).then(r => toast(r.error ? r.error.message : 'Password updated.')); } });
const cleanU = s => s.toLowerCase().replace(/[^a-z0-9_.]/g, '');
$('aGo').onclick = async () => {
  const m = $('aM'), name = cleanU($('aU').value);
  if (!sb){
    if (name.length < 3){ m.textContent = 'Username needs 3+ letters, numbers, dots or underscores.'; return; }
    user = {id:'demo', username:name, display_name:name, bio:'', accent:'#c8f54b'}; ls.set('wr_user', user); $('dAuth').close(); renderMe(); my = await db.mine(); return;
  }
  const email = $('aE').value.trim(), pw = $('aP').value;
  if (!email || pw.length < 6){ m.textContent = 'Enter an email and a password of 6+ characters.'; return; }
  m.textContent = 'Working...';
  try {
    let r;
    if (mode === 'up'){
      if (name.length < 3){ m.textContent = 'Username needs 3+ letters, numbers, dots or underscores.'; return; }
      r = await sb.auth.signUp({email, password:pw, options:{data:{username:name}, emailRedirectTo:RED}}); if (r.error) throw r.error;
      if (r.data.user && r.data.user.identities && !r.data.user.identities.length){ m.textContent = 'That email already has an account. Sign in, or tap Forgot password.'; return; }
      if (!r.data.session) return askCode('signup', 'We emailed you a code. Enter it below to confirm.');
    } else { r = await sb.auth.signInWithPassword({email, password:pw}); if (r.error) throw r.error; }
    await loadProfile(r.data.user); $('dAuth').close();
  } catch(e){ if (/not confirmed/i.test(e.message || '')) return askCode('signup', 'Your email isn’t confirmed yet. Tap “Resend confirmation email”, then enter the code.'); m.textContent = mailErr(e.message || '') || 'Something went wrong. Try again.'; }
};
async function loadProfile(u){
  let p = (await sb.from('profiles').select('*').eq('id', u.id).maybeSingle()).data;
  if (!p){
    const base = (cleanU((u.user_metadata && u.user_metadata.username) || u.email.split('@')[0]).slice(0, 20) || 'listener').padEnd(3, '_');
    for (let i = 0; i < 5 && !p; i++){ const nm = i ? base + Math.floor(Math.random() * 9000 + 1000) : base; const r = await sb.from('profiles').insert({id:u.id, username:nm, display_name:nm}).select().single(); if (!r.error) p = r.data; }
  }
  user = p || {id:u.id, username:u.email.split('@')[0], accent:'#c8f54b'};
  renderMe(); my = await db.mine(); if (tab === 'studio') renderStudio();
}
$('me').onclick = () => {
  if (!user) return openAuth('in');
  $('pD').value = user.display_name || ''; $('pU').value = user.username; $('pB').value = user.bio || ''; $('pL').value = user.link || ''; $('pCo').value = user.country || ''; const nf = user.notify_prefs || {}; $('nC').checked = nf.chat !== false; $('nV').checked = nf.live !== false; $('nF').checked = nf.friend !== false; $('pC').value = user.accent || '#c8f54b'; $('pM').textContent = '';
  setImg('av', user.avatar_url, 'a'); setImg('bn', user.banner_url, 'b'); $('dProf').showModal();
};
$('pSave').onclick = async () => {
  const u = cleanU($('pU').value), link = $('pL').value.trim();
  if (u.length < 3) return void ($('pM').textContent = 'Username needs 3+ letters, numbers, dots or underscores.');
  if (link && !/^https:\/\//.test(link)) return void ($('pM').textContent = 'The link must start with https://');
  const p = {username:u, display_name:$('pD').value.trim() || u, bio:$('pB').value.trim(), link:link || null, country:$('pCo').value || null, notify_prefs:{chat:$('nC').checked, live:$('nV').checked, friend:$('nF').checked, admin:true}, accent:$('pC').value, avatar_url:T.av || null, banner_url:T.bn || null, updated_at:new Date().toISOString()};
  if (sb){ const r = await sb.from('profiles').update(p).eq('id', user.id); if (r.error) return void ($('pM').textContent = r.error.code === '23505' ? 'That username is taken.' : r.error.message); }
  user = Object.assign(user, p); if (!sb) ls.set('wr_user', user);
  renderMe(); $('dProf').close();
};
$('pOut').onclick = async () => { if (window.pushForget) await pushForget(); if (sb) try { await sb.auth.signOut(); } catch(e){} await endLive(); user = null; my = null; ls.set('wr_user', null); renderMe(); $('dProf').close(); if (tab === 'studio') renderStudio(); };

/* ---- station create / edit ---- */
const ADJ = ['ember','neon','velvet','lunar','static','paper','golden','quiet','electric','mellow','hazy','cosmic','sunny','midnight'];
const NOUN = ['fox','owl','tide','moth','echo','comet','pine','drift','otter','signal','bloom','harbor','lantern','raven'];
const rnd = a => a[Math.random() * a.length | 0];
const cleanT = s => s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
function prevTag(){ $('sPrev').textContent = 'wmz/' + cleanT($('sT').value); }
$('sT').oninput = prevTag; $('sShuf').onclick = () => { $('sT').value = rnd(ADJ) + '-' + rnd(NOUN); prevTag(); };
$('sMode').onchange = () => $('sUw').hidden = $('sMode').value !== 'stream';
function openStation(){
  if (!need()) return;
  $('sTitle').textContent = my ? 'Edit your station' : 'Start your station';
  $('sN').value = my ? my.name : ''; $('sT').value = my ? my.tag : rnd(ADJ) + '-' + rnd(NOUN); prevTag();
  $('sD').value = my ? my.description : ''; $('sG').value = my ? (my.genres || []).join(', ') : ''; $('sC').value = my ? my.accent : (user.accent || '#c8f54b');
  $('sMode').value = my ? my.mode : 'live'; $('sU').value = my ? my.stream_url || '' : ''; $('sUw').hidden = $('sMode').value !== 'stream'; $('sM').textContent = '';
  setImg('lg', my && my.logo_url, 'a'); setImg('sb', my && my.banner_url, 'b'); $('dStn').showModal();
}
$('sGo').onclick = async () => {
  const m = $('sM'), n = $('sN').value.trim(), tag = cleanT($('sT').value).replace(/^-|-$/g, ''), mode = $('sMode').value, url = $('sU').value.trim();
  if (n.length < 2) return void (m.textContent = 'Give your station a name.');
  if (tag.length < 3) return void (m.textContent = 'Your wave tag needs at least 3 characters.');
  if (mode === 'stream' && !/^https:\/\//.test(url)) return void (m.textContent = 'The stream URL must start with https://');
  const p = {name:n, tag, description:$('sD').value.trim(), genres:$('sG').value.split(',').map(x => x.trim().toLowerCase()).filter(Boolean).slice(0, 8),
    accent:$('sC').value, logo_url:T.lg || null, banner_url:T.sb || null, mode, stream_url:mode === 'stream' ? url : null};
  try { my = await db.save(p); } catch(e){ return void (m.textContent = e.code === '23505' ? 'That wave tag is taken. Try shuffling for a new one.' : e.message); }
  $('dStn').close(); renderStudio();
};
