# Native Google Login for Android WebView (INTL)

This app now supports a native Google login bridge:

1. User taps **Google login** in web page
2. Web page sends bridge command `median://native-google-login/start`
3. Android opens native Google sign-in UI
4. Android returns `idToken` back to web via JS event
5. Web uses Supabase `signInWithIdToken(provider: 'google')`

---

## What was added

- Android native handler in `app/src/main/java/co/median/android/MainActivity.java`
  - listens to `JSBridge.postMessage({ medianCommand: "median://native-google-login/start" })`
  - launches Google Sign-In
  - dispatches JS event: `native_google_login_result`
- Web bridge helper in `../lib/native-google-login.ts`
  - sends command to native bridge
  - waits for `native_google_login_result`
  - exchanges `idToken` with Supabase
- Existing web login flow updated in `../components/dashboard.tsx`
  - Android WebView: native login first
  - fallback: existing OAuth redirect flow remains unchanged

---

## Required configuration

### 1) Google Cloud OAuth client

You need **Web Client ID** for Supabase token verification.

Set one of:

- Gradle property: `nativeGoogleWebClientId=xxx.apps.googleusercontent.com`
- Env var before build: `NATIVE_GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com`

You can also centrally manage it on web side via API:

- configure `.env.local`: `NATIVE_GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com`
- web fetches `/api/auth/native-google-config` and passes `clientId` into native bridge
- Android native uses bridge-provided `clientId` first, then fallback to `BuildConfig.NATIVE_GOOGLE_WEB_CLIENT_ID`

This value maps to `BuildConfig.NATIVE_GOOGLE_WEB_CLIENT_ID`.

### 2) Firebase / google-services.json (Android package)

Ensure `google-services.json` includes your package:

- `com.morntool.android.global`

Current build already validates package matching and fails fast if mismatched.

### 3) Supabase Google provider

In Supabase Auth -> Providers -> Google:

- enable provider
- configure same Google project credentials

The app uses `signInWithIdToken({ provider: 'google', token: idToken })`.

---

## Event contract

Android dispatches:

```js
window.dispatchEvent(new CustomEvent('native_google_login_result', {
  detail: {
    success: boolean,
    provider: 'google',
    idToken?: string,
    email?: string,
    displayName?: string,
    error?: string,
  }
}))
```

---

## Notes

- If user cancels sign-in, web receives cancellation and does not force fallback redirect.
- Non-Android/non-bridge environments continue using existing web OAuth redirect flow.
- This implementation is additive and should remain compatible with existing auth code.
