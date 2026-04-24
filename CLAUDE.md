# 보안관 (Boanggwan) — Project Context for Claude Code

> 이 파일은 Claude Code가 프로젝트를 이해하기 위한 컨텍스트 파일입니다.
> 프로젝트 루트에 위치시키면 Claude Code 실행 시 자동으로 읽습니다.

---

## 1. 프로젝트 개요

**앱명**: 보안관  
**정의문**: 급증하는 동네 모임 수요와 로컬 여행에 대한 높은 관심을 충족하기 위해, 실시간 지도와 신뢰 기반 지역 활동 데이터를 결합한 온·오프라인 커뮤니티 SNS 앱 '보안관'을 개발한다.  
**플랫폼**: iOS / Android (B2C)  
**개발자**: 소프트웨어학부 권현성 (학번 20192801)  
**1차 마감**: 2026년 5월 25일  

---

## 2. 핵심 기능 4가지

1. **SNS** — 지역 기반 피드, 장소 태깅, 좋아요/댓글, 스토리(24시간)
2. **MAP** — 지도 메인 UI, 1탭 핀 저장, 장소 큐레이션, 실시간 위치 기반
3. **Local Community** — 카테고리별 소모임(gatherings), 번개 모임, 퀘스트(도움 요청)
4. **Sheriff System** — 활동 점수 기반 보안관 뱃지, 월 TOP 10 자동 부여, 분야별 뱃지

---

## 3. 기술 스택 (확정)

| 분류 | 기술 | 비고 |
|------|------|------|
| Mobile | React Native + Expo Bare Workflow | React 경험 활용 |
| 언어 | TypeScript | 풀스택 통일 |
| 지도 (국내) | Kakao Map API | 하이퍼로컬 최적화 |
| 지도 (글로벌) | Google Maps API | Provider 추상화로 전환 가능 |
| 위치 | expo-location | A-GPS ±10~20m |
| 인증 | Firebase Authentication | 카카오 Custom Token, 애플, 구글 |
| DB | Firebase Firestore | 메인 데이터베이스 |
| 실시간 채팅 | Firebase Realtime Database | 채팅방 메시지 |
| 파일 저장 | Firebase Storage | 이미지/미디어 |
| 서버리스 백엔드 | Firebase Cloud Functions | 점수 집계, Cron Job, FCM 발송 |
| 알림 | FCM (Firebase Cloud Messaging) | iOS/Android 통합 |
| 빌드 | EAS Build | Mac 없이 iOS/Android 클라우드 빌드 |
| OTA | EAS Update | 앱스토어 심사 없이 JS 코드 업데이트 |
| CI/CD | GitHub Actions | 자동 빌드/배포 |
| 버전 관리 | Git + GitHub (Git Flow) | |
| IDE | VS Code | |
| API 테스트 | Postman | |
| UI 설계 | Figma | |
| DB 관리 | DBeaver (HeidiSQL 병행 가능) | |

---

## 4. 폴더 구조

```
boanggwan/                        ← 프론트엔드 (React Native)
  ├── src/
  │   ├── screens/                ← 화면 컴포넌트
  │   ├── components/             ← 공통 컴포넌트
  │   ├── hooks/                  ← 커스텀 훅
  │   ├── store/                  ← 전역 상태관리 (Zustand)
  │   ├── api/                    ← Firebase 호출 함수
  │   ├── utils/                  ← 유틸 함수
  │   ├── types/                  ← TypeScript 타입 정의
  │   └── constants/              ← 상수 (색상, 라우트명 등)
  ├── app.json
  └── firebase.config.ts          ← Firebase 초기화
```

---

## 5. Firestore DB 스키마

### users/{uid}
```typescript
{
  uid: string,                    // Firebase Auth UID
  nickname: string,
  email: string,
  provider: 'kakao' | 'apple' | 'google',
  profile_img: string,            // Storage URL
  points: number,                 // 현재 보유 포인트
  sheriff_score: number,          // 랭킹 산정용 누적 점수
  badge_list: string[],           // 획득한 뱃지 ID 리스트
  saved_places: string[],         // 저장한 장소 ID 리스트 (나의 지도)
  followers: string[],            // 나를 팔로우하는 uid 리스트
  following: string[],            // 내가 팔로우하는 uid 리스트
  rank_level: string,             // 현재 등급 명칭
  home_location?: GeoPoint,       // 주거지 인증 좌표
  home_address?: string,
  is_home_verified: boolean,
  createdAt: Timestamp
}
```

### posts/{post_id}
```typescript
{
  post_id: string,                // 자동 생성
  author_id: string,              // 작성자 uid
  type: 'feed' | 'story',         // story는 24시간 후 필터링
  content: string,
  media_urls: string[],           // Storage URL 배열
  location: {
    name: string,                 // 장소명
    coordinates: GeoPoint
  },
  geohash: string,                // 지역 기반 노출용 위치 해시
  tags: string[],                 // 해시태그 리스트
  likes: string[],                // 좋아요 누른 uid 리스트
  timestamp: Timestamp
}

// 서브컬렉션
posts/{post_id}/comments/{comment_id}
{
  author_id: string,
  content: string,
  timestamp: Timestamp
}
```

### gatherings/{gathering_id}
```typescript
{
  gathering_id: string,
  host_id: string,
  title: string,                  // 예: "이번 주말 남산 산책하실 분?"
  description: string,
  category: string,               // 취미, 운동, 맛집 등
  location: GeoPoint,
  max_members: number,
  participants: string[],         // 확정된 uid 리스트
  pending_requests: string[],     // 대기 중인 uid 리스트
  meeting_at: Timestamp,
  status: 'recruiting' | 'full' | 'completed'
}
```

### quests/{quest_id}
```typescript
{
  quest_id: string,
  requester_id: string,           // 도움 요청자 uid
  responder_id: string | null,    // 수락한 보안관 uid
  title: string,                  // 예: "강아지를 찾고 있어요"
  description: string,
  location: GeoPoint,
  reward_points: number,          // 완료 시 지급 포인트
  difficulty: 'Easy' | 'Normal' | 'Hard',
  status: 'open' | 'in_progress' | 'done' | 'failed',
  verification_photo: string | null  // 완료 인증 사진 URL
}
```

### chats/{room_id}
```typescript
{
  room_id: string,                // gathering_id 또는 quest_id와 동일
  room_type: 'gathering' | 'quest',
  related_id: string,             // 연결된 gathering_id 또는 quest_id
  members: string[],              // 참여자 uid 리스트
  last_message: string
}

// 서브컬렉션
chats/{room_id}/messages/{message_id}
{
  sender_id: string,
  text: string,
  timestamp: Timestamp
}
```

---

## 6. 기능명세서 요약

### AUTH (인증)
- AUTH-01: 카카오 소셜 로그인 (Firebase Custom Token)
- AUTH-02: 신규 유저 Firestore 문서 자동 생성
- AUTH-03: 자동 로그인 (onAuthStateChanged)
- AUTH-04: 로그아웃
- AUTH-05: 애플 로그인 (App Store 정책 필수)

### USER (유저 프로필)
- USER-01~02: 프로필 조회/수정
- USER-03: 프로필 이미지 수정 (Storage 업로드)
- USER-04: 주거지 인증 (expo-location GPS → Firestore GeoPoint)
- USER-05~08: 타 유저 조회, 팔로우/언팔로우
- USER-09~11: 포인트/뱃지/저장장소 조회

### MAP (지도)
- MAP-01: Kakao Map 초기화, 현재 위치 중심 렌더링
- MAP-02: expo-location 실시간 위치 표시
- MAP-03~04: 내 핀 표시, 1탭 핀 저장 (saved_places 배열 업데이트)
- MAP-05: Kakao Local API + TourAPI 키워드 검색 병행
- MAP-06: 주변 모임(gatherings/quests) 마커 표시
- MAP-07: 로컬 코스 경로 시각화 (Kakao 경로 오버레이)

#### 지도 탭 구조 (3탭)
- **Basic** — 지역 탐색 메인. 동네 하이라이트 + 추천 장소 핀 + 바텀시트
- **My Own** — 내가 저장한 핀만 표시. 지역 필터 없음. 전국 내 핀 관리
- **Quest** — 현재 위치 중심 반경으로 퀘스트 표시. 지역 선택 없음

### POST (게시물)
- POST-01~02: 피드/스토리 작성 (geohash 자동 생성)
- POST-03~05: 목록/상세 조회, 수정, 삭제
- POST-06~11: 좋아요 토글, 댓글 CRUD
- POST-12~13: 장소 태깅, 해시태그 파싱

### GATHERING (모임)
- GATH-01: 모임 생성
- GATH-02~03: 목록/상세 조회
- GATH-04~06: 참여 신청, 승인/거절
- GATH-07~09: 모임 취소, 참여 취소, 번개 모임

### QUEST (퀘스트)
- QUEST-01: 퀘스트 등록 (포인트 선지정)
- QUEST-02~03: 목록/상세 조회
- QUEST-04: 퀘스트 수락
- QUEST-05: 완료 인증 (사진 업로드 → 포인트 지급 Cloud Functions)
- QUEST-06~07: 실패 처리, 취소

### CHAT (채팅)
- CHAT-01: 모임/퀘스트 승인 시 채팅방 자동 생성
- CHAT-02~05: 채팅방 목록, 메시지 전송/실시간 수신, 나가기

### SHERIFF (보안관 시스템) — Cloud Functions
- 게시물 작성: sheriff_score +10
- 좋아요 받기: +2
- 모임 참여: +15
- 퀘스트 완료: +30
- 매월 1일 00:00 Cron Job → 지역별 상위 10명 보안관 뱃지 자동 부여

### NOTIFICATION (알림) — FCM
- 모임 참여 신청 → 모임장
- 참여 승인/거절 → 신청자
- 퀘스트 수락/완료 → 요청자/수락자
- 댓글 → 게시물 작성자

---

## 7. 지도 API 전략

- **국내 MVP**: Kakao Map API (하이퍼로컬 데이터 정확도 우수)
- **글로벌 확장**: Google Maps API로 전환
- **설계 원칙**: Map Provider를 추상화 레이어로 분리하여 전환 시 코드 수정 최소화

```typescript
// 예시: Provider 추상화
const mapProvider = userCountry === 'KR'
  ? KakaoMapProvider
  : GoogleMapProvider;
```

---

## 8. 개발 일정 (기능별, 10주)

| 주차 | 기간 | 기능 |
|------|------|------|
| W1~W2 | 3/18~3/28 | DB 스키마 설계 · Figma · 환경 셋업 |
| W2~W3 | 3/25~4/4 | 로그인 · 카카오 인증 (BE+FE) |
| W4~W5 | 4/7~4/18 | 지도 메인 · 핀 저장 · 주거지 인증 (BE+FE) |
| W6~W7 | 4/21~5/2 | 게시물 작성 · 조회 (BE+FE) |
| W8~W9 | 5/5~5/16 | 모임 생성 · 참여 신청 (BE+FE) |
| W10 | 5/19~5/25 | 통합 테스트 · 버그 수정 |

**개발 방식**: 기능별 BE(Firestore+Cloud Functions) → FE(React Native) 순서로 완성 후 테스트

---

## 9. 1차 MVP 범위 (5/25 마감)

### 포함
- 카카오 소셜 로그인
- 지도 메인 + 핀 저장
- 게시물 작성/조회 (피드)
- 주거지 인증 (GPS)
- 모임 생성·참여 신청

### 제외 (2차 이후)
- 애플·구글 로그인
- 스토리 기능
- 로컬 코스 경로 시각화
- 번개 모임
- 보안관 뱃지 자동 부여 Cron Job
- 점수 랭킹 조회
- 푸시 알림 (FCM)
- 퀘스트 시스템 (포인트 지급)

---

## 10. 개발 규칙

- **브랜치 전략**: Git Flow (main, develop, feature/*, hotfix/*)
- **커밋 컨벤션**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- **TypeScript 엄격 모드**: strict: true
- **상태관리**: Zustand (전역), React useState (로컬)
- **Firestore 규칙**: 인증된 사용자만 읽기/쓰기, 본인 문서만 수정 가능
- **이미지 업로드**: Storage → URL 저장 (직접 URL 저장 금지)
- **위치 권한**: 선택적 허용, 거부 시 기본 위치(서울 중심) fallback

---

## 11. 향후 비전 (2차 이후)

### 타겟 확장
1. **로컬 주민** (현재) → 동네 모임·맛집·보안관 뱃지
2. **여행객** (2단계) → 주민 추천 여행지·로컬 코스·여행 동행 매칭
3. **글로벌 유저** (3단계) → 다국어·국가별 커뮤니티·글로벌 동행 매칭

### 비전
> "전 세계 어디서나, 진짜 현지를 경험하고 진짜 이웃을 만나는 플랫폼"

---

## 12. 참고문헌

[1] 당근, 「당근 '모임' 오픈 1년 만에 1500만 이용자 돌파」, Jul. 31, 2024.  
[2] 당근, 「당근, '2025 연말결산' 데이터 공개」, Dec. 18, 2025.  
[3] 한국관광공사·문화체육관광부, 「2025 관광트렌드」, 2024.  
[4] 양은주·정완규·이기형, 「동네의 재발견」, 한국언론정보학보, vol.105, 2021.  
[5] J. Bao et al., GeoInformatica vol.19 no.3, 2015.  
[6] Market Research Future, Hyperlocal Services Market Report, 2025.  
[7] 황유선, KISDI STAT Report vol.24 no.09, May 2024.  

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that does not match DESIGN.md.

Key token (keep in sync with DESIGN.md):
- Screen background: `#FFFFFF`
- Card surface: `#FFFFFF`
- Input field background: `#F5F5F5`
- Border: `#D4D4D4`

---

## 8. Basic 탭 지도 UI 상세 설계

### 기본 화면 동작
1. 앱 오픈 → expo-location으로 현재 위치 감지
2. 내 위치가 속한 동/읍/면으로 자동 줌
3. 해당 동 영역을 골드 계열 반투명 오버레이로 하이라이트
4. 동네 안에 추천 장소 핀 표시 (최대 10~15개 제한)
5. 하단 바텀시트 자동 등장

### 지도 탭 3가지 역할
- Basic — 지역 탐색 메인. 동네 하이라이트 + 추천 장소 핀 + 바텀시트
- My Own — 내가 저장한 핀만 표시. 지역 필터 없음. 전국 내 핀 관리
- Quest — 현재 위치 중심 반경으로 퀘스트 표시. 지역 선택 없음

### 핀 표시 기준 (필터링)
- 주민 저장 수 3개 이상인 장소
- 최근 30일 내 관련 게시물이 있는 장소
- TourAPI 반경 내 상위 5개 공식 관광지
- 현재 모집 중(recruiting) 상태의 모임만

### 핀 종류 및 색상
- 노란 핀 — 주민 추천 장소 (saved_places 기반)
- 파란 핀 — TourAPI 공식 관광지
- 초록 핀 — 현재 모집 중인 모임 (gatherings)
- 빨간 핀 — 퀘스트 (Quest 탭에서만 표시)

### 핀 클릭 동작
- 미니 툴팁 없이 바로 바텀시트 팝업
- 바텀시트: 장소명 / 위치·거리 / 주민 저장 수 / [게시물 보기] [저장] 버튼 2개

### 지역 변경 동작
- 지도 드래그 → 새로운 동으로 이동 시 하이라이트 자동 변경
- 바텀시트 지역명 + 콘텐츠 자동 업데이트
- 줌 레벨에 따라 지역 단위 변경: 동 → 구 → 시

### 바텀시트 탭 구성
- 게시물 탭 — 해당 동 geohash 기반 최신 피드
- 장소 탭 — 주민 추천 핀(노란) + TourAPI 공식 관광지(파란) 구분 표시
- 모임 탭 — 해당 지역 현재 모집 중인 gatherings

### 신뢰도 표시 (차별점)
- 보안관 뱃지 보유자가 저장한 장소 → 금색 테두리 강조
- 바텀시트에 "보안관 N명이 저장한 장소" 문구 표시
- 일반 주민 저장과 시각적으로 구분

### UI 차별화 포인트 (기존 SNS 대비)
- 지도가 메인, 피드는 바텀시트 안에 (기존 SNS는 반대)
- 게시물마다 현위치에서 거리 표시 (예: 230m)
- 보안관 뱃지 보유자 게시물 → 금색 테두리 강조
- 퀘스트 카드 → 주황/빨간 계열 + 난이도 뱃지 + 포인트 표시
- 첫 화면부터 지도 + 동네 핀이 보여 지도 기반 앱 인상 즉시 전달
- 데이터 없는 지역은 "첫 게시물 올리기" CTA 표시 → 신규 지역 콘텐츠 생성 유도
