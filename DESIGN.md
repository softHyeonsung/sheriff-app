# Design System — 보안관 (Sheriff)

## Product Context
- **What this is:** A hyperlocal Korean community SNS app where neighbors meet, join gatherings, complete quests, and earn Sheriff badges
- **Who it's for:** Korean locals (20-40s), starting with a neighborhood MVP
- **Space/industry:** Korean community / local SNS (peers: 당근마켓 모임, 네이버 밴드)
- **Project type:** Mobile app (React Native + Expo, iOS/Android)

## Aesthetic Direction
- **Direction:** Warm Civic / Golden Hour
- **Decoration level:** Intentional — warm surfaces, amber tints, the sheriff badge as a motif
- **Mood:** Every color and surface should feel like late afternoon sun washing over a neighborhood. Warm, trustworthy, approachable. Not a startup dark-mode, not a sterile white SNS. Like a campfire gathering, not a corporate dashboard.
- **Moodboard source:** `C:\Users\user\OneDrive\바탕 화면\moodboard.png` — warm amber/gold palette, sunset imagery, sheriff badge, community gatherings, Woody (sheriff toy)

## Typography
- **Display/Hero:** AppleSDGothicNeo Bold — screen titles, card headings
- **Body:** AppleSDGothicNeo Regular — feed content, descriptions, comments
- **UI/Labels:** AppleSDGothicNeo Medium — buttons, tab labels, metadata
- **Emphasis:** AppleSDGothicNeo SemiBold — section headers, card titles
- **Heavy:** AppleSDGothicNeo Heavy — badge labels, rank display
- **Source:** `assets/fonts/Apple_산돌고딕_Neo/` — TTF files loaded via `useFonts`. Works cross-platform (NOT system font — explicitly loaded asset).
- **React Native font names:**
  ```
  'AppleSDGothicNeo-Regular'  → AppleSDGothicNeoR.ttf
  'AppleSDGothicNeo-Medium'   → AppleSDGothicNeoM.ttf
  'AppleSDGothicNeo-SemiBold' → AppleSDGothicNeoSB.ttf
  'AppleSDGothicNeo-Bold'     → AppleSDGothicNeoB.ttf
  'AppleSDGothicNeo-Heavy'    → AppleSDGothicNeoH.ttf
  ```
- **Note:** Moodboard originally specified AppleSDGothicNeo. TTF files are already in `assets/fonts/` — loading them explicitly via `useFonts` makes them work on Android too. Pretendard is not needed.
- **Scale:**
  ```
  xs:   12px / 0.75rem
  sm:   14px / 0.875rem
  base: 16px / 1rem
  lg:   18px / 1.125rem
  xl:   20px / 1.25rem
  2xl:  24px / 1.5rem
  3xl:  30px / 1.875rem
  4xl:  36px / 2.25rem
  ```

## Color
- **Approach:** Restrained — amber is the hero, used purposefully, not decoratively
- **Primary (amber):** `#FFAC30` — CTAs, active tab states, sheriff badge fill, progress bars
- **Dark amber (leather):** `#A36E1D` — secondary text, icon fills, badge outlines, depth
- **Gold (reward):** `#FFD700` — sparingly: badge stars, score highlights, rank-up moments
- **Background:** `#FFFFFF` — white
- **Surface (cards):** `#FFFFFF` — card backgrounds, map overlays, list item backgrounds
- **Surface 2 (elevated):** `#F5F5F5` — input field backgrounds, category tags, chip backgrounds
- **Border:** `#D4D4D4` — dividers, card borders, input borders
- **Text primary:** `#1A1108` — near-black with warm undertone (NOT #000000)
- **Text muted:** `#7A5C38` — metadata, timestamps, secondary labels
- **Text light:** `#B89060` — placeholder text, disabled states
- **Success:** `#4CAF6A`
- **Error:** `#E05252`
- **Warning:** `#F59E0B`
- **Dark mode surfaces:** `--bg: #1A1108` / `--surface: #2A1E0F` / `--surface-2: #3A2A14`
- **Dark mode strategy:** Reduce amber saturation ~15%, warm dark neutrals (no pure #000)

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable — community apps need breathing room, not data density
- **Scale:**
  ```
  xs:  4px
  sm:  8px
  md:  16px
  lg:  24px
  xl:  32px
  2xl: 48px
  3xl: 64px
  ```

## Layout
- **Approach:** Grid-disciplined for app screens, map-as-hero for home
- **Home screen:** Map fills full screen, floating cards overlay from bottom
- **Content screens:** Single column, 16px horizontal padding
- **Max content width:** N/A (mobile native)
- **Border radius:**
  ```
  sm:   6px  (chips, tags, small buttons)
  md:   12px (inputs, alerts, small cards)
  card: 16px (cards, bottom sheets, modals)
  lg:   20px (bottom tab bar overlay cards)
  pill: 9999px (badges, pills, avatar borders)
  badge-star: custom SVG polygon (6-point star shape)
  ```
- **Bottom tab bar:** 5 tabs — 홈 / 지도 / 모임 / 퀘스트 / 나. Active: `#FFAC30`. Inactive: `#B89060`.
- **Sheriff badge (UI element):** 6-point SVG star — use as score indicator, not just a number. Fills in as score grows. Pulse animation on rank-up.

## Motion
- **Approach:** Intentional — subtle but purposeful
- **Easing:** enter: `ease-out` / exit: `ease-in` / move: `ease-in-out`
- **Duration:**
  ```
  micro:  50-100ms   (hover states, toggles)
  short:  150-200ms  (tab transitions, button press)
  medium: 250-350ms  (screen transitions, card entrance)
  long:   400-600ms  (modal open/close, map pin drop)
  special: 800-1200ms (badge award celebration — scale + glow)
  ```
- **Map pin drop:** Bounce ease, 400ms — makes placing a pin feel satisfying
- **Badge award:** Scale 0.8 → 1.1 → 1.0, glow pulse in gold, 800ms — rank-up should feel earned

## User Journey — Emotional Arc

| Step | User Does | User Feels | Design Supports It |
|---|---|---|---|
| 1. Launch | Sees login screen | "Is this trustworthy?" | Sheriff star SVG + warm amber CTA — feels handcrafted, not generic |
| 2. Sign up | Enters email + password | "Hope this is worth it" | Immediate success → map loads. No onboarding carousel. First thing they see is their neighborhood. |
| 3. Map loads | Sees their neighborhood with KTO pins | "Oh, I recognize this" | Warm amber map tones + familiar local place names. Instant recognition. |
| 4. First save | Taps a place, saves it | "This is mine now" | Pin color changes to `#4CAF6A`, subtle scale-up animation (150ms). Satisfying. |
| 5. First post | Writes about a local place | "I'm contributing" | Post appears in feed with their avatar. Small dopamine hit. |
| 6. First +10P | Post gets liked by someone | "People noticed" | "+10P 적립!" toast in amber. Score bar nudges up. |
| 7. **THE WOW MOMENT** | Hits first score threshold | "I'm a real sheriff now" | Full-screen badge award overlay: star pulses gold, "Rookie 보안관 달성! 🛡️". Lingers 2s. Shareable. |
| 8. Return | Opens app again next day | "What's new near me?" | Map remembers last position. Feed shows neighborhood updates since last visit. |

**5-second visceral reaction (first launch):** Warm amber, Korean typography, sheriff star. Feels like a neighborhood app, not a startup.
**5-minute behavioral hook:** Saving a place + posting something. Both actions give immediate feedback (pin saves, post appears).
**5-year reflective value:** "I was one of the first sheriffs in 마포구." The badge system creates neighborhood history.

**The wow moment spec (Step 7):**
- Trigger: first time `sheriff_score` crosses a rank threshold (rookie → deputy → sheriff → marshal)
- Overlay: full-screen semi-transparent `rgba(26,17,8,0.85)` + centered sheriff star SVG
- Animation: star scales `0.5 → 1.15 → 1.0` (600ms) + `#FFD700` glow pulse
- Text: rank name in Pretendard Bold 28px white + "달성!" below in Regular 16px `#FFD700`
- Duration: auto-dismiss 2.5s, or tap anywhere to dismiss
- Share: "자랑하기" button → native share sheet

## Interaction State Coverage

| Screen / Feature | Loading | Empty | Error | Success |
|---|---|---|---|---|
| Login — submit | 버튼 텍스트 "로그인 중..." + disabled | — | Alert with `error.message` (already done) | Navigate to map |
| Map — initial load | Amber shimmer over map tiles | — | "지도를 불러올 수 없어요" + retry button | Map renders, pins appear |
| Map — pin tap | Card slides up from bottom (250ms ease-out) | — | — | Card shows gathering/quest detail |
| Map mode toggle | Mode label transitions (150ms) | **내 지도 empty**: "아직 저장한 장소가 없어요 📍" + "장소 저장하기" CTA | — | Pins filter to selected mode |
| Feed — list | 3 skeleton post cards (shimmer, amber pulse) | "아직 게시물이 없어요 🌅 첫 게시물을 올려보세요!" + write button | "피드를 불러올 수 없어요" + retry | Posts render |
| Feed — like | Instant optimistic update (heart fills amber immediately) | — | Revert + subtle shake animation | — |
| 모임 — list | Skeleton cards | "근처 모임이 없어요 🤝 첫 모임을 만들어보세요!" + create button | retry | Gathering cards render |
| 모임 — join request | "신청 중..." spinner on button | — | Alert with reason | Button changes to "신청 완료" (disabled) |
| 채팅 — room list | Skeleton rows | "아직 채팅방이 없어요 💬 모임에 참여해보세요!" + link to 모임 tab | retry | Chat rooms render |
| 채팅 — message send | Message bubble appears immediately (optimistic) | — | Bubble turns red with retry icon | — |
| 프로필 — load | Avatar shimmer + stat placeholders | — | "프로필을 불러올 수 없어요" + retry | Profile renders |
| Badge award | Full-screen overlay: star pulse + "보안관 Lv.X 달성!" (800ms celebration) | — | — | Overlay auto-dismisses after 2s |
| Quest complete | Photo upload → "완료 인증 중..." spinner | — | Alert + keep photo | "+30P 획득!" toast (success green, 3s) |

**Map cold-start rule:** KTO (한국관광공사) destination pins are always present in 기본 mode — the map is never truly empty. Sparse-area empty state only applies to 모임·퀘스트 mode filter: show "이 지역의 첫 보안관이 되어보세요! 🛡️" + "모임 만들기" CTA.

**Empty state design rule (applies to all):** Warm emoji anchor + one-line description in `#7A5C38` + primary CTA button in amber. Never plain "No items found."

**Skeleton loading rule:** All skeletons use `#F5F5F5` base with `#E8E8E8` shimmer pulse. 200ms animation cycle.

## Navigation Architecture

### Tab Bar (5 tabs)
```
지도  |  피드  |  모임  |  채팅  |  프로필
```
- Active color: `#FFAC30`. Inactive: `#B89060`. Background: `#FFFFFF`.
- Icons: use react-native-vector-icons or custom SVG — NOT FontAwesome (too generic)
- 퀘스트 has NO dedicated top-level tab — quests are discovered on the map

### Map Screen — 3 Mode Toggle
The map is the home screen and the primary discovery surface. A segmented toggle at the top switches between 3 views:
```
[기본]  |  [내 지도]  |  [모임·퀘스트]
```

**Toggle component spec (custom pill tabs):**
- Container: `backgroundColor: '#F5F5F5'`, `borderRadius: 9999`, `padding: 3`, `flexDirection: 'row'`
- Outer wrap: floating card over map, `position: 'absolute'`, `top: 56`, centered horizontally, `marginHorizontal: 16`
- Each pill: `paddingHorizontal: 14`, `paddingVertical: 7`, `borderRadius: 9999`
- Active pill: `backgroundColor: '#FFAC30'`, text `color: '#1A1108'`, `fontWeight: '600'`
- Inactive pill: `backgroundColor: 'transparent'`, text `color: '#8A6030'`, `fontWeight: '400'`
- Transition: 150ms background color change on press
- Shadow: `box-shadow: 0 2px 8px rgba(163,110,29,0.15)` on outer container
- **기본**: All nearby pins (posts, active gatherings, open quests)
- **내 지도**: Only the user's saved places (`saved_places` array)
- **모임·퀘스트**: Gathering pins + quest pins filtered to open/recruiting status

Pin colors:
- Gathering: `#FFAC30` (amber)
- Quest: `#A36E1D` (leather brown)
- Saved place: `#4CAF6A` (success green)

### Header Style Per Screen
```
지도 (map):      headerShown: false — map is full-bleed, toggle floats over it
피드 (feed):     headerShown: true, title: '보안관', right: notification bell icon
모임:            headerShown: true, title: '모임', right: create (+) button
채팅:            headerShown: true, title: '채팅'
프로필:          headerShown: true, title: username string (dynamic)
```
All visible headers: `backgroundColor: '#FFFFFF'`, `borderBottomColor: '#D4D4D4'`, title `color: '#1A1108'` Pretendard Bold 18px.

### Post Image Aspect Ratio
- Feed posts: **4:3** (standard for Korean SNS — wider than 16:9, feels social not cinematic)
- Profile grid: **1:1** square thumbnails
- Story: **9:16** full-screen
- Implementation: `<Image style={{ width: '100%', aspectRatio: 4/3, borderRadius: 12 }} />`

### Sheriff Star — SVG, Not Emoji
Replace `🛡️` in `login.tsx` title with an inline SVG 6-point star (same as the design preview page). Emoji renders inconsistently across Android versions and at small sizes looks blurry.

```tsx
// src/components/ShieldIcon.tsx
const ShieldStar = ({ size = 32 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40">
    <Polygon
      points="20,2 23.5,13 35,13 26,20 29.5,31 20,24.5 10.5,31 14,20 5,13 16.5,13"
      fill="#FFAC30" stroke="#A36E1D" strokeWidth="1.2"
    />
  </Svg>
);
```

### Information Hierarchy — Login Screen
```
1st: Brand mark — 보안관 + sheriff star SVG (visual anchor)
2nd: Email + password fields
3rd: 로그인 button — PRIMARY (filled #FFAC30, #1A1108 text)
4th: "계정이 없으신가요? 회원가입" — SECONDARY (text-only link, not a full button)
5th: Divider + social login buttons — TERTIARY
```

## Sheriff Badge System (UI spec)
- Displayed as 6-point SVG star (`<polygon points="...">`)
- Fill: `#FFD700` (gold) when earned, `#EFE0C4` (gray-border) when locked
- Stroke: `#A36E1D` at 1.2px
- Score bar: amber gradient `#FFAC30 → #FFD700`, fills left to right
- Rank labels: rookie / deputy / sheriff / marshal (map to score thresholds)

## Accessibility & Device Spec

### Touch Targets
- All tappable elements: `minHeight: 44` (Apple HIG), `minWidth: 44`
- Tab bar icons: already handled by Expo Tabs (44px touch area)
- Map pins: `width: 36, height: 36` (current spec) — borderline. Add `hitSlop: {top:8, bottom:8, left:8, right:8}`

### Color Contrast (WCAG AA)
| Pair | Ratio | Pass? |
|---|---|---|
| `#FFAC30` on `#1A1108` (amber button) | 4.6:1 | ✅ AA |
| `#1A1108` on `#FFFFFF` (body text) | 19.3:1 | ✅ AAA |
| `#7A5C38` on `#FFFFFF` (muted text) | 5.9:1 | ✅ AA |
| `#8A6030` on `#FFFFFF` (inactive tab) | 6.3:1 | ✅ AA |
| `#B89060` on `#FFFFFF` (placeholder text) | 3.2:1 | ❌ Fail — do not use for body text |

### Screen Reader (React Native)
- All interactive elements: `accessibilityLabel` in Korean
- Map pins: `accessibilityLabel="[type] [title], [location]"` e.g. `"모임 남산 산책, 용산구"`
- Tab bar: expo-router handles automatically via `title` prop
- Badge award overlay: `accessibilityAnnouncement` on mount — "보안관 Lv.X 달성!"
- Images: `accessibilityLabel` required on all `<Image>` components

### Device Sizes
- Primary target: 375px width (iPhone SE / standard)
- Secondary: 390px (iPhone 14 Pro), 360px (mid-range Android)
- Text scale: respect `useWindowDimensions` for font scaling — do NOT use fixed px on body text
- Safe area: all screens use `<SafeAreaView>` — map screen uses `<SafeAreaView edges={['top']}>` only (bottom must be transparent for map)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Pretendard over AppleSDGothicNeo | Cross-platform (iOS + Android). Same aesthetic — clean Korean sans. Moodboard specified AppleSDGothicNeo but it is iOS-system-only. |
| 2026-04-07 | Map screen: Hybrid layout (A+C) | Full-bleed map + amber gradient wash (bottom 35%) + floating mode toggle pill + sliding pin card. Variant A's full map + Variant C's amber warmth. Not Card Rail (B) — wastes too much map space. |
| 2026-04-07 | AppleSDGothicNeo TTF loaded explicitly via useFonts | Files already in assets/fonts/. Loaded explicitly = works on Android too. Pretendard not needed. |
| 2026-04-06 | Background #FFFDF7 not #FFFFFF | Warm off-white carries the golden-hour moodboard feel through every screen. Every competitor uses pure white. |
| 2026-04-15 | Background changed to #F0F0F0 | User preference: light neutral gray background. Cards (#FFF8EC) and chips (#FFF0D4) now appear warmer/lighter than the bg, creating card elevation through color contrast. |
| 2026-04-24 | Background changed to #FFFFFF, input bg #F5F5F5, border #D4D4D4 | User preference: clean white base. Input fields use #F5F5F5 (balanced gray) to define field boundaries without heaviness. Borders unified to #D4D4D4 across all inputs and cards. |
| 2026-04-06 | Sheriff badge as living UI element | 6-point star fills in with score progress. Makes earning feel real, not just a number incrementing. |
| 2026-04-06 | Map as home screen (not feed) | Primary differentiation from 당근/Daangn. The moodboard is geographically grounded — map-first reinforces that. |
| 2026-04-06 | Amber #FFAC30 as single primary | Directly from moodboard. All three moodboard colors are amber family — system coherence comes from one primary with light/dark variants. |
