# Dharmapuri Connect — Firebase setup

```
app/       Expo (React Native) app — Android, iOS and the website
admin/     Admin dashboard (React + Vite) — approve, add, edit, feature places
backend/   Firestore security rules, data import and admin scripts
data/      Original JSON data (source for the first import)
```

Until step 2 is done the app runs on bundled data (`app/src/data/places.seed.json`),
so you can try it right away: `cd app && npm run web`.

## 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> → **Add project** (e.g. `mydharmapuri`).
2. **Build → Firestore Database → Create database** → production mode → region `asia-south1` (Mumbai).
3. **Build → Authentication → Get started → Sign-in method → Google → Enable.**
   Under *Settings → Authorized domains* add your website domains (e.g. `mydharmapuri.com`, `admin.mydharmapuri.com`).
4. **Project settings → Your apps → Add app → Web** (`</>`). Copy the `firebaseConfig` values.

## 2. Connect the app and admin

```sh
cp app/.env.example app/.env       # fill EXPO_PUBLIC_FIREBASE_* values
cp admin/.env.example admin/.env   # same values, VITE_ prefix
```

## 3. Deploy rules and import the data

```sh
npm install -g firebase-tools      # once
firebase login
cd backend
firebase use --add                 # pick your project
npm install
npm run deploy:rules               # uploads firestore.rules + indexes
```

Download a service-account key: **Project settings → Service accounts → Generate new private key**,
save it as `backend/service-account.json` (git-ignored — never commit it). Then:

```sh
npm run import                     # pushes all places from data/*.json into Firestore
```

Re-running `npm run import` after editing `data/*.json` updates text fields but keeps
view counts, status and featured settings. Add `-- --overwrite` to reset them.

## 4. Make yourself admin

1. `cd admin && npm install && npm run dev`, open the URL and **Continue with Google** once.
2. `cd backend && npm run set-admin -- you@gmail.com`
3. Reload the admin page.

## How it works

- **Places** live in the `places` collection. `status` is `approved` (public), `pending`
  (waiting for review) or `rejected`.
- **Add a place** in the app requires Google sign-in; submissions arrive as `pending`
  in the admin dashboard's *Pending* tab for approval.
- **Frequently looked up**: places with a *Featured position* come first (use the
  *Featured tag*, e.g. "Sponsored", for ads), then the most-viewed places. Each place
  opened in the app counts one view per session.
- **Security**: `backend/firestore.rules` lets the public read approved places only,
  lets signed-in users create pending places, lets anyone add exactly +1 to `views`,
  and reserves everything else for admins (users listed in the `admins` collection).

## Google sign-in on phones

Web sign-in works as soon as step 1 is done. Android/iOS sign-in uses native Google
Sign-In, which needs a **development build** (it does not work in Expo Go):

1. In Firebase add Android (`com.mydharmapuri.app`) and iOS (`com.mydharmapuri.app`) apps;
   download `google-services.json` and `GoogleService-Info.plist` into `app/`.
2. Add your Android SHA-1 fingerprint (from `npx eas-cli credentials`) in the Firebase Android app.
3. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `app/.env`
   (Authentication → Sign-in method → Google → *Web SDK configuration*).
4. In `app/app.json` set `"android.googleServicesFile": "./google-services.json"`,
   `"ios.googleServicesFile": "./GoogleService-Info.plist"`, and configure the
   `@react-native-google-signin/google-signin` plugin with your iOS URL scheme
   (see https://react-native-google-signin.github.io/docs/setting-up/expo).
5. `npx eas-cli build --profile development`.

Browsing works in Expo Go without any of this.

## Running and deploying

```sh
cd app && npm start            # Expo dev server (press w for web, scan QR for phone)
cd app && npm run build:web    # static website in app/dist
cd admin && npm run build      # admin dashboard in admin/dist
```

Both `dist` folders are single-page apps: the host must serve `index.html` for unknown
paths. `backend/firebase.json` already configures that for Firebase Hosting
(`firebase target:apply hosting app <site>` / `... admin <site>`, then `firebase deploy --only hosting`).

To test locally without a real project: `firebase emulators:start` in `backend/`
(needs Java 21+), then run the scripts with `FIRESTORE_EMULATOR_HOST=localhost:8080`.
