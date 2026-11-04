/* wave.radio · firebase-messaging-sw.js · receives push messages while the app is closed.
   Must stay in the site's main folder. The Firebase settings arrive from js/config.js through the address. */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
try {
  const cfg = JSON.parse(decodeURIComponent(new URL(self.location.href).searchParams.get('cfg') || '{}'));
  if (cfg.apiKey){ firebase.initializeApp(cfg); firebase.messaging(); }   // messages with a notification payload are shown by Firebase itself
} catch (e) {}
