# TODOS

Items deferred from /plan-ceo-review on 2026-04-03.

---

## P1 — Fix before Google login goes live

### Google login broken on Android (`id_token` undefined)
**What:** `responseType: 'id_token'` is not supported on Android by Google's OAuth policy.
`googleResponse.params.id_token` is always `undefined` on Android — the login silently fails.
**Why:** Any Android user who taps "Google로 계속하기" gets nothing.
**How:** Switch to `responseType: 'code'` + PKCE, then exchange the auth code for an
`id_token` via `expo-auth-session`'s `exchangeCodeAsync`, or route through a Cloud Function.
**Effort:** M (human: ~3h / CC: ~20min)
**File:** `app/login.tsx` lines 39-44, 57-64
**Ref:** https://docs.expo.dev/guides/authentication/#google

---

## P1 — Fix before Kakao login goes live

### Kakao users get blank nickname on first login
**What:** Firebase Custom Token auth never populates `user.email`. After Kakao login,
`createUserDoc` always writes `email: ''` and `nickname: ''`.
**Why:** Every Kakao user lands with an empty display name — broken first impression.
**How:** Two options:
  - (A) Include email + nickname in custom token claims from the Cloud Function
  - (B) Show a "Set your nickname" screen after first Kakao login (detect `nickname === ''`)
  Option B is better UX — Kakao users often prefer a separate app nickname.
**Effort:** M (human: ~2h / CC: ~15min)
**File:** `src/api/auth.ts` + Cloud Function + new NicknameSetup screen

---

## P2 — Fix before sharing with real users

### Hide unconfigured social login buttons
**What:** The login screen shows Google, Kakao, and Apple buttons even when credentials
are not configured. Greyed-out buttons that do nothing confuse real users.
**Why:** Dead UI looks unfinished and creates a bad first impression before credentials are real.
**How:** Hide social buttons behind a credential check (e.g. `KAKAO_REST_API_KEY !== 'YOUR_KAKAO_REST_API_KEY'`)
or simply remove them from the UI until the credentials are configured.
**Effort:** S (human: ~30min / CC: ~5min)
**File:** `app/login.tsx`
**Depends on:** Real Kakao/Google credentials being configured

---

## P3 — Nice to have

### Extract email/password validation helper
~~**What:** `handleLogin` and `handleSignUp` in `login.tsx` had duplicated validation logic.~~
~~**Status:** DONE — extracted to `validateEmailPassword()` during CEO review (2026-04-03)~~
