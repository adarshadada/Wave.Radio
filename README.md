# wave.radio

Upload everything in this folder to the root of your GitHub Pages repo (keep the folders).

```
index.html      the app
about.html      about page
privacy.html    privacy policy
terms.html      terms and conditions
manifest.webmanifest   lets people install the site as an app
firebase-messaging-sw.js   push alerts when the app is closed (keep in the main folder)
admin.html      admin panel (sign in with an admin account)
css/            style.css, animations.css, games.css, notifications.css, website.css, pages.css
js/             config.js (Supabase keys), core.js, backend.js, player.js, stations.js, account.js,
                studio.js, social.js, notifications.js, push.js, feedback.js, ads.js, home.js, games.js, multiplayer.js, morse.js, tinyham.js, script.js
assets/         logo, favicons (svg + png), app icons (icon-192, icon-512) and game icons
```
Scripts load in the order listed in index.html. Multiplayer games need no database changes.

android-app/    native Android shell (built by GitHub Actions, see android-app/README.md)
