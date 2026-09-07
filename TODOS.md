# TODOS

Items deferred from /plan-ceo-review on 2026-04-03.

---

## RESOLVED — stale by the time of the 2026-07-31 code audit

The three items below were logged on 2026-04-03 against an earlier version of the
auth code. Re-checked while auditing for ONE store (원스토어) submission: the actual
login flow was rewritten in commit `26534ee` (Kakao Firebase Custom Token + security
hardening) and no longer has these bugs. Leaving the record here instead of just
deleting it, since the original reports weren't wrong for the code that existed then.

- **Google login on Android (`id_token` undefined):** `app/login.tsx`'s
  `handleGoogleLogin` doesn't use `expo-auth-session`'s Google provider (the thing
  Google restricts for Android-type client IDs). It manually opens
  `accounts.google.com/o/oauth2/v2/auth` via `WebBrowser.openAuthSessionAsync` (system
  browser, not embedded WebView) against a **Web application** OAuth client
  (`GOOGLE_WEB_CLIENT_ID`), which Google's policy does allow for the implicit
  `response_type=id_token` flow. Not retested on a real device this session — flagged
  as "no longer the bug that was described," not as "verified working."
- **Kakao blank nickname on first login:** `app/login.tsx`'s `handleKakaoLogin` calls
  `loginWithKakao` (`src/api/kakaoAuth.ts`), which never touches the client-side
  `createUserDoc` helper that used to blank the field. The `kakaoCustomToken` Cloud
  Function now does the entire Firestore upsert server-side with the real nickname
  before minting the custom token. (`loginWithKakaoCustomToken` in `src/api/auth.ts`
  still exists and still has the blanking risk, but it's dead code — nothing in the
  app calls it, only its own test does.)
- **Hide unconfigured social login buttons:** `KAKAO_REST_API_KEY` and
  `GOOGLE_WEB_CLIENT_ID` are both populated with real-looking values now, not
  placeholders — the buttons aren't dead UI. Re-open this if either credential goes
  back to a placeholder.

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

Items found by /review on 2026-07-27 while reviewing map-chronicle-quest — all pre-existing, out of scope for that feature. **Fixed on 2026-07-31** during pre-ONE store code audit; kept here for the record.

## DONE — Cloud Functions 과금/DoS 노출 (부분 해결)

### kakaoDirections/odsayDirections에 App Check·rate limit 없음
**What:** 두 Cloud Function이 `request.auth != null`만 확인하고 유저당 호출 제한이 없었다.
**Fix:** `functions/src/index.ts`에 `checkAndIncrementDailyLimit()` 추가 — uid별 하루 50회로 제한(Firestore 트랜잭션, `users/{uid}/daily_stats/{date}` 문서 재사용). 한도 초과 시 `resource-exhausted` 에러.
**남은 부분:** 이건 App Check(클라이언트 증명)가 아니라 순수 카운터 기반 제한이다. 진짜 App Check(reCAPTCHA/Play Integrity)는 네이티브 SDK 연동 + Firebase 콘솔 설정이 필요해 코드만으로 끝나지 않으므로 별도 작업으로 남김.
**File:** `functions/src/index.ts` (재배포 필요: `firebase deploy --only functions`)

## DONE — 하드코딩된 Kakao REST API 키 노출

### create-post.tsx/create-gathering.tsx에 API 키가 소스에 하드코딩됨
**Fix:** 두 파일 모두 하드코딩된 실키 fallback → `?? ''`로 통일(`index.tsx`와 동일 패턴). `.env`에 실키가 있어 로컬 동작엔 영향 없음.
**남은 부분:** git 히스토리에는 옛 커밋에 실키가 그대로 남아있다 — 원한다면 Kakao 개발자 콘솔에서 재발급 고려.
**File:** `app/create-post.tsx`, `app/create-gathering.tsx`

## DONE — 전역 posts 구독 스케일 문제

### 여러 화면이 필터 없이 전체 posts 컬렉션을 구독
**Fix:** `subscribeFeedPosts()`에 선택적 `authorId` 파라미터 추가 — `where('author_id','==',authorId)`로 서버 필터링(복합 인덱스가 필요 없도록 orderBy 없이 받고 클라이언트에서 timestamp로 정렬). `profile.tsx`/`user/[uid].tsx`/`shared-map/[uid].tsx` 세 화면에 적용.
**적용 안 함:** `index.tsx`/`feed.tsx`는 커뮤니티 전체 피드라서 의도적으로 전역 구독 유지 — 문제였던 적 없음.
**File:** `src/api/posts.ts` + 3개 소비 화면

## DONE — 길찾기 stale-response 레이스

### searchRoute의 dirSearchCancelled가 단일 boolean이라 경쟁 상태 발생
**Fix:** `dirSearchCancelled`(boolean) → `dirRequestId`(세대 토큰, `useRef(0)`)로 교체. `searchRoute` 시작 시 `++dirRequestId.current`로 로컬 `requestId`를 캡처하고, 각 await 이후 및 `finally`에서 `requestId === dirRequestId.current`로 비교해 오래된 응답을 무시한다. `closeDirections`도 동일 카운터 증가로 통일.
**File:** `app/(tabs)/index.tsx` (searchRoute, closeDirections)

## DONE — auth.test.ts의 getDoc 목 누락

### `__tests__/auth.test.ts`가 `getDoc is not a function`으로 실패
**What:** `firebase/firestore` 목이 `getDoc`을 제공하지 않았는데, `createUserDoc`이 신규/재로그인 분기를 위해 `getDoc`을 먼저 호출하도록 바뀐 뒤로 계속 깨져있었다.
**Fix:** 목에 `getDoc: jest.fn()` 추가. 기존 "merge:true means repeated signUp..." 테스트는 사실 신규 유저 분기(merge 없음)를 테스트하고 있어 항상 잘못된 기대값이었다 — `getDoc` exists:true를 모킹해 실제 재로그인 병합 분기(`{email, provider}` + `{merge:true}`)를 검증하도록 재작성.
**File:** `__tests__/auth.test.ts`
