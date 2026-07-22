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

---

Items deferred from /plan-ceo-review on 2026-07-22 (동네 연대기 — 지도 성장 + 여행 코스 추천).

## P3 — Deferred expansions (map-chronicle-quest)

### 등급업 셀레브레이션 애니메이션
**What:** 지도 마커가 flag→이정표→집→호텔→빌딩으로 등급이 오를 때, 기존 보안관 뱃지 어워드 스펙(스케일 0.8→1.1→1.0 + 골드 글로우 펄스, 800ms)을 재사용한 축하 애니메이션.
**Why:** 데모 임팩트가 크지만 이번 라운드는 핵심 집계/코스 기능이 우선이라 미룸.
**Effort:** S
**Depends on:** map-chronicle-quest 핵심 기능(등급 계산, 마커 렌더링) 완료 후

### 동네 스카이라인 공유 이미지
**What:** 수집한 랜드마크들을 하나의 스카이라인 이미지로 렌더링해 공유하는 기능.
**Why:** 소셜 자랑 요소로 좋지만 렌더링 품질 리스크가 있어 코어 기능 검증 후 진행.
**Effort:** M
**Depends on:** map-chronicle-quest 핵심 기능 완료 후

### 친구 지도 동시 비교 뷰
**What:** 현재는 `shared-map/[uid].tsx`를 확장해 상대방 지도 화면 하나만 보여준다. 나와 상대방의 랜드마크 지도를 한 화면에서 동시에(나란히 또는 오버레이) 비교하는 뷰는 사용자가 명시적으로 이번 라운드에서 제외하고 후속 작업으로 남김.
**Why:** 공모전 데드라인(2026-09-21) 안에서는 단일 화면 확장이 더 현실적이고, 동시 비교는 레이아웃/인터랙션 설계가 별도로 필요.
**Effort:** M
**Depends on:** 친구 지도 비교(shared-map 확장) 완료 후

**Ref:** `~/.gstack/projects/sheriff-app/ceo-plans/2026-07-22-map-chronicle-quest.md`
**공모전 제출일:** 2026-09-21 (CLAUDE.md의 1차 마감 5/25는 이미 지난 날짜이므로 참고 시 주의)
