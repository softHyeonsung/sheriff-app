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

---

Items found by /review on 2026-07-27 while reviewing map-chronicle-quest — all pre-existing, out of scope for that feature.

## P1 — Cloud Functions 과금/DoS 노출

### kakaoDirections/odsayDirections에 App Check·rate limit 없음
**What:** `functions/src/index.ts`의 두 Cloud Function은 `request.auth != null`만 확인하고 App Check나 유저당 호출 제한이 없다.
**Why:** 카카오 로그인 계정만 있으면(만들기 쉬움) 앱 UI를 거치지 않고 함수를 직접 반복 호출해 Kakao Mobility/ODSay API 과금을 무한정 늘릴 수 있다. 이번에 추가한 코스 추천 기능은 탭 1번에 최대 4번 체이닝 호출하므로 노출을 더 키운다.
**How:** Firebase App Check 추가 + uid별 rate limit(Firestore 카운터 또는 Cloud Functions rate-limit extension).
**Effort:** M (human: ~4h / CC: ~30min)
**File:** `functions/src/index.ts`

## P1 — 하드코딩된 Kakao REST API 키 노출

### create-post.tsx/create-gathering.tsx에 API 키가 소스에 하드코딩됨
**What:** `KAKAO_REST_KEY`가 `create-post.tsx`/`create-gathering.tsx`에는 여전히 `?? '6d840fb987f5a8ffac05946ef5e9b00c'` 폴백으로 하드코딩돼 있다. `index.tsx`는 이미 `?? ''`로 제거됐는데 나머지 두 파일만 남아 불일치.
**Why:** 실제 키가 git 히스토리에 그대로 노출되어 있고, 세 파일이 서로 다른 동작을 한다(env var 없는 빌드에서 index.tsx만 조용히 검색 실패).
**How:** 세 파일 모두 `?? ''`로 통일하고, 필요하면 키를 하나의 공유 상수 모듈로 옮겨 재발 방지. 노출된 키는 Kakao 개발자 콘솔에서 재발급 고려.
**Effort:** S (human: ~30min / CC: ~10min)
**File:** `app/create-post.tsx`, `app/create-gathering.tsx`

## P2 — 전역 posts 구독 스케일 문제

### 여러 화면이 필터 없이 전체 posts 컬렉션을 구독
**What:** `shared-map/[uid].tsx`, `index.tsx`, `profile.tsx`, `user/[uid].tsx`가 전부 `subscribeFeedPosts()`로 전체 posts를 구독한 뒤 클라이언트에서 `author_id`로 필터링한다. `where` 절 없음.
**Why:** 게시물 수가 늘어날수록 화면 하나 열 때마다 전체 컬렉션을 내려받는 비용이 커진다. 이번 랜드마크 기능은 기존 패턴을 그대로 재사용했을 뿐, 새로 만든 문제는 아님.
**How:** `subscribeFeedPosts`에 선택적 `where('author_id','==',uid)` 파라미터 추가하고 화면별로 점진 전환.
**Effort:** M (human: ~1일 / CC: ~1시간)
**File:** `src/api/posts.ts` + 4개 소비 화면

## P2 — 길찾기 stale-response 레이스

### searchRoute의 dirSearchCancelled가 단일 boolean이라 경쟁 상태 발생
**What:** `app/(tabs)/index.tsx`의 `dirSearchCancelled`는 공유 boolean이라, 모달을 닫았다 빠르게 다시 열고 검색하면 새 요청이 `false`로 리셋한 뒤 먼저 보낸(오래된) 요청의 응답이 화면을 덮어쓸 수 있다.
**Why:** 사용자가 목적지를 바꿔가며 빠르게 검색할 때 잘못된 경로가 그려질 수 있음.
**How:** boolean 대신 요청마다 증가하는 세대 토큰(`requestId.current++`)으로 교체, 응답 시점에 비교.
**Effort:** S (human: ~1h / CC: ~10min)
**File:** `app/(tabs)/index.tsx` (searchRoute 함수)
