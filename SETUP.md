# MyDharmapuri — Firebase setup

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
- **Sponsorships** (admin *Featured* tab): each featured place can have a monthly fee and a
  from/until date. The app stops featuring a place after its until date.
- **Payments** (admin *Payments* tab): one record per business per month in the `payments`
  collection (`{placeId}_{YYYY-MM}`), admin-only. Featured places with a fee and no payment show as *Due*.
- **Analytics** (admin *Analytics* tab): the app counts views, calls, directions and shares per
  business per month in `stats/{placeId}_{YYYY-MM}` (India time; once per session each). Download as CSV.
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

## Releasing the Android app (Google Play)

The app replaces the old Play listing, so it keeps the package `com.techieqa.dharmapuri`.
Bump `android.versionCode` in `app/app.json` for every upload (Play rejects a code it has seen).

```sh
cd app
npx eas-cli login                                     # once, Expo account
npx eas-cli build -p android --profile preview        # .apk to install on a phone and test
npx eas-cli build -p android --profile production     # .aab to upload to Play Console
```

Signing: Play only accepts uploads signed with the listing's **upload key**
(Play Console → Test and release → App integrity → *Upload key certificate*). Give EAS that
keystore on the first production build, or request an upload-key reset there and let EAS generate one.

Google sign-in on the Play build needs the **SHA-1 of the upload key and of the app signing key**
(both shown on that App integrity page) added in Firebase → Project settings → Android app.
`app/eas.json` carries the public Firebase web config because `.env` isn't uploaded to EAS.

## Ads (AdMob, app only)

`src/components/Ads.native.tsx` shows a native ad card on the home page and after every ~10 listings in a
category, and an adaptive banner on place pages and under search results. The website never shows them
(`Ads.tsx` renders nothing). Consent (EEA/UK) is asked via Google's UMP form before ads load.

Until real IDs are set, the app shows **Google test ads**. To go live:

1. In `app/app.json` → `react-native-google-mobile-ads` plugin, set `androidAppId` (and `iosAppId`)
   to your AdMob app IDs (`ca-app-pub-…~…`).
2. In `app/eas.json` → `build.base.env`, set `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` and
   `EXPO_PUBLIC_ADMOB_NATIVE_ANDROID` (ad unit IDs). Dev and `preview` builds always use test ads; only `production` shows real ads.
3. Add `app/public/app-ads.txt` with your AdMob publisher line and redeploy the website.
4. In Play Console declare *Contains ads* and the advertising ID in Data safety.

## Hosting on Hostinger (mydharmapuri.com)

Both sites are deployed as built static files through Hostinger's API (Git deploy can't be used:
Hostinger doesn't build, and the site root always holds the `admin` subdomain folder).

| Site | Hostinger folder | Built from |
|---|---|---|
| mydharmapuri.com | `public_html` | `app/dist` |
| admin.mydharmapuri.com | `public_html/admin` | `admin/dist` |

```sh
scripts/deploy-hostinger.sh          # build both and deploy
scripts/deploy-hostinger.sh website  # or just one
```

Needs a Hostinger API token (hPanel → profile → API) in `~/.hostinger-token`
(`pbpaste > ~/.hostinger-token && chmod 600 ~/.hostinger-token`) — never inside the repo.
The website deploy replaces the site root but keeps the `admin` folder.
`.htaccess` files reproduce the Firebase Hosting rules (clean URLs, place/category fallbacks, 404,
caching, https + no-www; SPA fallback for the admin). DNS is at GoDaddy: `@` and `admin` → 193.203.185.191.

## Running and deploying

```sh
cd app && npm start            # Expo dev server (press w for web, scan QR for phone)
cd app && npm run build:web    # static website in app/dist
cd admin && npm run build      # admin dashboard in admin/dist
```

`npm run build:web` pre-renders one HTML page per place and category for search engines:
it snapshots approved places from Firestore (`scripts/sync-places.mjs`), runs `expo export`,
then writes each page's `<title>`/description/canonical/Open Graph tags plus `sitemap.xml`
and `robots.txt` (`scripts/seo-postbuild.mjs`). Rebuild and redeploy after adding places so
they get their own pages; until then they still open via the `/place/[id]` fallback.
Set `EXPO_PUBLIC_SITE_URL` if the site is not served from `https://mydharmapuri.com`.

The admin `dist` is a single-page app (serve `index.html` for unknown paths).
Both are hosted on Hostinger (see above). Firebase Hosting only keeps the project's default site,
which 301-redirects `dharmapuri-directory.web.app` / `.firebaseapp.com` to mydharmapuri.com while still
serving Firebase's `/__/auth/…` sign-in handler (`firebase.json`, `backend/hosting-redirect/`).

To test locally without a real project: `firebase emulators:start` in `backend/`
(needs Java 21+), then run the scripts with `FIRESTORE_EMULATOR_HOST=localhost:8080`.
