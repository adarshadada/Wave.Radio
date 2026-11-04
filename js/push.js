/* wave.radio · js/push.js · Push alerts that arrive when the app is closed.
   In the Android app: native Firebase push through Capacitor. In a browser: Firebase web push (needs js/config.js).
   Device tokens are saved in Supabase (push_tokens). */
const isNative = () => !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
const PUSH = {
  token:ls.get('wr_push', null), msg:null, ready:false,
  get native(){ return isNative(); },
  get on(){ return isNative() || !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.appId && FCM_VAPID_KEY); }
};
const pushLoad = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
const pushSave = async (token, ua) => { const r = await sb.rpc('register_push_token', {p_token:token, p_ua:ua}); if (r.error) throw r.error; PUSH.token = token; ls.set('wr_push', token); };

/* ---- Android app (Capacitor) ---- */
function pushPlugin(){
  const p = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications;
  if (!p) throw new Error('Push is not built into this app version. Rebuild the app.');
  return p;
}
async function nativeRegister(silent){
  const PN = pushPlugin();
  let perm = await PN.checkPermissions();
  if (perm.receive !== 'granted'){
    if (silent) return false;
    perm = await PN.requestPermissions();
    if (perm.receive !== 'granted') throw new Error('Alerts were not allowed. You can allow them in Android settings.');
  }
  if (!PUSH.ready){
    PUSH.ready = true;
    await PN.addListener('registration', async t => { try { if (sb && user && user.id !== 'demo') await pushSave(t.value, 'android-app'); else { PUSH.token = t.value; ls.set('wr_push', t.value); } } catch(e){ toast('Could not save this device: ' + (e.message || e)); } });
    await PN.addListener('registrationError', e => toast('Push registration failed: ' + (e.error || 'unknown error')));
    await PN.addListener('pushNotificationActionPerformed', a => { const d = (a.notification && a.notification.data) || {}; if (d.link || d.kind) notifOpen({kind:d.kind || '', link:d.link || ''}); });
  }
  await PN.register();
  return true;
}

/* ---- browser (Firebase web push) ---- */
async function pushInit(){
  if (PUSH.msg) return PUSH.msg;
  if (!('serviceWorker' in navigator) || !('Notification' in window)) throw new Error('This browser does not support push alerts.');
  const v = '10.12.2';
  await pushLoad(`https://www.gstatic.com/firebasejs/${v}/firebase-app-compat.js`);
  await pushLoad(`https://www.gstatic.com/firebasejs/${v}/firebase-messaging-compat.js`);
  if (!firebase.messaging.isSupported()) throw new Error('Push alerts are not available in this browser.');
  firebase.initializeApp(FIREBASE_CONFIG); PUSH.msg = firebase.messaging();
  return PUSH.msg;
}
async function webRegister(silent){
  if (Notification.permission === 'default' && !silent){ if (await Notification.requestPermission() !== 'granted') throw new Error('Alerts were not allowed.'); }
  if (Notification.permission !== 'granted') return false;
  const m = await pushInit();
  const reg = await navigator.serviceWorker.register('firebase-messaging-sw.js?cfg=' + encodeURIComponent(JSON.stringify(FIREBASE_CONFIG)));
  await navigator.serviceWorker.ready;
  const token = await m.getToken({vapidKey:FCM_VAPID_KEY, serviceWorkerRegistration:reg});
  if (!token) throw new Error('Could not get a device token.');
  await pushSave(token, navigator.userAgent.slice(0, 120));
  return true;
}

async function pushEnable(silent){
  try {
    if (!PUSH.on) throw new Error('Push alerts are not set up yet.');
    if (!sb || !user || user.id === 'demo') throw new Error('Sign in first.');
    const ok = PUSH.native ? await nativeRegister(silent) : await webRegister(silent);
    if (ok && !silent) toast('Push alerts are on for this device.');
    return !!ok;
  } catch(e){ if (!silent) toast(e.message || 'Could not turn on push alerts.'); return false; }
}
async function pushForget(){
  const t = PUSH.token; PUSH.token = null; ls.set('wr_push', null);
  if (t && sb) try { await sb.from('push_tokens').delete().eq('token', t); } catch(e){}
}

/* quick self-check shown in the notifications window */
async function pushDiag(){
  const out = [PUSH.native ? 'Running in the Android app: yes' : 'Running in the Android app: no (browser)'];
  if (PUSH.native){
    try { out.push('Notification permission: ' + (await pushPlugin().checkPermissions()).receive); } catch(e){ out.push('Push plugin: missing from this app build'); }
  } else {
    out.push(PUSH.on ? 'Firebase settings: found' : 'Firebase settings: missing in js/config.js');
    out.push('Browser permission: ' + (window.Notification ? Notification.permission : 'not supported here'));
    try { out.push('Service worker: ' + (!('serviceWorker' in navigator) ? 'not supported here' : (await navigator.serviceWorker.getRegistration()) ? 'registered' : 'not registered yet')); } catch(e){ out.push('Service worker: error'); }
  }
  out.push('This device: ' + (PUSH.token ? 'token saved' : 'no token yet'));
  if (sb && user && user.id !== 'demo'){
    const r = await sb.from('push_tokens').select('token', {count:'exact', head:true});
    out.push('Devices saved in the database: ' + (r.error ? 'error (' + r.error.message + ')' : r.count));
  } else out.push('Signed in: no');
  if (!PUSH.native && /; wv\)|WebView/i.test(navigator.userAgent)) out.push('This looks like a website wrapper app. Web push cannot work here. Install the new wave.radio app instead.');
  return out;
}
$('nChk').onclick = async () => { $('nDiag').textContent = 'Checking...'; $('nDiag').textContent = (await pushDiag()).join('\n'); };
