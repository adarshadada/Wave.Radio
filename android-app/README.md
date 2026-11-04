# wave.radio Android app

A thin native shell around the website, built by GitHub (no computer needed). It adds real Android push alerts.

1. Firebase console > Project settings > General > Add app > Android. Package name: com.waveradio.app
   Download google-services.json and copy everything inside it.
2. GitHub repo > Settings > Secrets and variables > Actions > New repository secret.
   Name: GOOGLE_SERVICES_JSON   Value: the whole file.
3. Create .github/workflows/android.yml (the file is in the chat) and run: Actions > Build Android app > Run workflow.
4. When it turns green: Releases > latest > download app-debug.apk and install it.

The app loads https://adarshadada.github.io/Music-website/, so website updates reach the app without rebuilding.
