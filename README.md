# 보안관 (Boanggwan)

> 실시간 지도와 신뢰 기반 지역 활동 데이터를 결합한 온·오프라인 커뮤니티 SNS 앱

급증하는 동네 모임 수요와 로컬 여행에 대한 높은 관심을 충족하기 위해, 하이퍼로컬 지도 기반으로 주민 추천 장소·모임·퀘스트를 연결하는 커뮤니티 플랫폼입니다.

---

## 핵심 기능

| 기능 | 설명 |
|------|------|
| **SNS** | 지역 기반 피드, 장소 태깅, 좋아요/댓글, 스토리(24시간) |
| **MAP** | 카카오맵 메인 UI, 핀 저장, 동네 하이라이트, 실시간 위치 기반 장소 큐레이션 |
| **Local Community** | 카테고리별 소모임(gatherings), 번개 모임, 퀘스트(도움 요청) |
| **Sheriff System** | 활동 점수 기반 보안관 뱃지, 월 TOP 10 자동 부여, 분야별 뱃지 |

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | React Native + Expo Bare Workflow |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| State | Zustand |
| Map | Kakao Map API (WebView) |
| Location | expo-location |
| Auth | Firebase Authentication (Kakao Custom Token) |
| Database | Firebase Firestore |
| Realtime Chat | Firebase Realtime Database |
| Storage | Firebase Storage |
| Build | EAS Build |
| OTA | EAS Update |

---

## 시작하기

### 사전 요구사항

- Node.js 18+
- npm 또는 yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`) — 빌드/배포 시
- Firebase 프로젝트

### 설치

```bash
git clone https://github.com/softHyeonsung/sheriff-app.git
cd sheriff-app
npm install
```

### Firebase 설정

`src/firebaseConfig.ts`에 Firebase 프로젝트 정보를 입력합니다.

```ts
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

### 앱 실행

```bash
# 개발 서버 시작
npm start

# Android
npm run android

# iOS
npm run ios
```

---

## 빌드 (EAS)

```bash
# Android APK (로컬 테스트용)
eas build --platform android --profile preview

# iOS / Android 스토어 배포
eas build --platform all --profile production

# OTA 업데이트
eas update --branch production --message "업데이트 내용"
```

---

## 프로젝트 구조

```
sheriff-app/
├── app/                        # Expo Router 화면 (file-based routing)
│   ├── (tabs)/                 # 탭 네비게이션
│   │   ├── index.tsx           # 지도 메인 (Basic)
│   │   ├── feed.tsx            # 피드
│   │   ├── community.tsx       # 모임/퀘스트
│   │   ├── chat.tsx            # 채팅 목록
│   │   └── profile.tsx         # 내 프로필
│   ├── post/[id].tsx           # 게시물 상세
│   ├── gathering/[id].tsx      # 모임 상세
│   ├── dm/[roomId].tsx         # 채팅방
│   ├── user/[uid].tsx          # 타 유저 프로필
│   ├── shared-map/[uid].tsx    # 공유 지도
│   ├── login.tsx               # 로그인
│   ├── profile-setup.tsx       # 최초 프로필 설정
│   ├── create-post.tsx         # 게시물 작성
│   └── create-gathering.tsx    # 모임 생성
├── src/
│   ├── api/                    # Firebase 호출 함수
│   │   ├── auth.ts             # 인증 (카카오 Custom Token)
│   │   ├── posts.ts            # 게시물 CRUD
│   │   ├── gatherings.ts       # 모임 CRUD
│   │   ├── chat.ts             # 채팅
│   │   ├── users.ts            # 유저 프로필
│   │   ├── scoring.ts          # 보안관 점수
│   │   └── tourApi.ts          # TourAPI 연동
│   ├── components/             # 공통 컴포넌트
│   ├── store/                  # Zustand 전역 상태
│   │   ├── authStore.ts
│   │   ├── mapStore.ts
│   │   ├── postStore.ts
│   │   └── gatheringStore.ts
│   ├── hooks/                  # 커스텀 훅
│   ├── constants/              # 상수 (뱃지, 지역 코드 등)
│   └── types/                  # TypeScript 타입 정의
├── firestore.rules             # Firestore 보안 규칙
├── storage.rules               # Storage 보안 규칙
└── firebase.json
```

---

## DB 스키마

Firestore 컬렉션 구조 및 관계도 →  
[FigJam ERD 보기](https://www.figma.com/board/xqfvDIRwtgXKIjE7HPDezv)

| 컬렉션 | 설명 |
|--------|------|
| `users/{uid}` | 유저 프로필, 보안관 점수, 뱃지 |
| `posts/{post_id}` | 피드/스토리 게시물 |
| `posts/{id}/comments/{id}` | 댓글 (서브컬렉션) |
| `gatherings/{gathering_id}` | 소모임 |
| `quests/{quest_id}` | 퀘스트 |
| `chats/{room_id}` | 채팅방 |
| `chats/{id}/messages/{id}` | 메시지 (서브컬렉션) |

---

## 개발 규칙

- **브랜치 전략**: Git Flow (`main`, `develop`, `feature/*`, `hotfix/*`)
- **커밋 컨벤션**: `feat:` / `fix:` / `chore:` / `docs:` / `refactor:`
- **TypeScript**: `strict: true`
- **상태 관리**: Zustand (전역), `useState` (로컬)
- **Firestore 규칙**: 인증된 유저만 읽기/쓰기, 본인 문서만 수정

---

## 개발 일정

| 주차 | 기간 | 내용 |
|------|------|------|
| W1~W2 | 3/18~3/28 | DB 설계 · Figma · 환경 셋업 |
| W2~W3 | 3/25~4/4 | 로그인 · 카카오 인증 |
| W4~W5 | 4/7~4/18 | 지도 메인 · 핀 저장 · 주거지 인증 |
| W6~W7 | 4/21~5/2 | 게시물 작성 · 조회 |
| W8~W9 | 5/5~5/16 | 모임 생성 · 참여 신청 |
| W10 | 5/19~5/25 | 통합 테스트 · 버그 수정 |

**1차 MVP 마감**: 2026년 5월 25일

---

## 개발자

**권현성** — 소프트웨어학부 (학번 20192801)
