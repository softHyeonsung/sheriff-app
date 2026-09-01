import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

admin.initializeApp();
const db = admin.firestore();

// ── 카카오 Custom Token 발급 ────────────────────────────────────────────────────
// 클라이언트에서 Kakao access_token을 보내면 카카오 API로 검증 후 Firebase
// Custom Token을 반환한다. 클라이언트는 이 토큰으로 signInWithCustomToken() 호출.

export const kakaoCustomToken = onCall(
  { region: 'asia-northeast3' },
  async (request) => {
    const accessToken: string = request.data?.accessToken;
    if (!accessToken) throw new HttpsError('invalid-argument', 'accessToken required');

    // 1. 카카오 사용자 정보 조회
    const kakaoRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!kakaoRes.ok) throw new HttpsError('unauthenticated', 'Kakao token invalid');
    const kakaoData = await kakaoRes.json() as { id?: number; kakao_account?: Record<string, unknown> };
    if (!kakaoData.id) throw new HttpsError('unauthenticated', 'Cannot get Kakao user id');

    const uid = `kakao_${kakaoData.id}`;
    const account = kakaoData.kakao_account as Record<string, Record<string, string>> | undefined;
    const nickname = account?.profile?.nickname ?? '카카오 사용자';
    const email    = account?.email ?? '';
    const profileImg = account?.profile?.profile_image_url ?? '';

    // 2. Firestore 사용자 문서 upsert
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) {
      await userRef.set({
        uid,
        nickname,
        email,
        provider: 'kakao',
        profile_img: profileImg,
        points: 0,
        sheriff_score: 0,
        badge_list: [],
        saved_places: [],
        followers: [],
        following: [],
        rank_level: 'rookie',
        is_home_verified: false,
        profile_complete: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await userRef.update({ nickname, email, profile_img: profileImg });
    }

    // 3. Firebase Custom Token 발급
    const customToken = await admin.auth().createCustomToken(uid);
    return { customToken };
  }
);

// ── 매월 1일 00:00 KST — 지역별 상위 10명 보안관 뱃지 자동 부여 ──────────────
// KST(UTC+9) 00:00 = UTC 전날 15:00 → cron: '0 15 L * *' 이 정확하지 않으므로
// timeZone 옵션을 쓰면 Firebase가 변환해줍니다.

export const monthlySheriffBadge = onSchedule(
  {
    schedule: '0 0 1 * *',   // 매월 1일 00:00
    timeZone: 'Asia/Seoul',
    region: 'asia-northeast3',
  },
  async () => {
    const now = new Date();
    // 부여 대상 월 = 직전 달
    const target = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year  = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const badgeId = `sheriff_${year}_${month}`;

    // 1. 모든 사용자 sheriff_score 내림차순 조회
    const snapshot = await db
      .collection('users')
      .orderBy('sheriff_score', 'desc')
      .get();

    // 2. home_address(구/동 단위)별로 그룹핑
    const regionMap: Record<string, Array<{ uid: string; score: number }>> = {};

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const score: number = data.sheriff_score ?? 0;
      if (score <= 0) continue;

      // home_address 예: "서울특별시 종로구 청운동"
      // 구 단위로 그룹핑 (없으면 '전국' 버킷)
      const address: string = data.home_address ?? '';
      const gu = extractGu(address) ?? '전국';

      if (!regionMap[gu]) regionMap[gu] = [];
      regionMap[gu].push({ uid: docSnap.id, score });
    }

    // 3. 각 지역 top 10에게 뱃지 부여
    const batch = db.batch();
    let totalAwarded = 0;

    for (const [, users] of Object.entries(regionMap)) {
      const top10 = users
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      for (const { uid } of top10) {
        const ref = db.collection('users').doc(uid);
        batch.update(ref, {
          badge_list: admin.firestore.FieldValue.arrayUnion(badgeId),
        });
        totalAwarded++;
      }
    }

    await batch.commit();
    functions.logger.info(`[monthlySheriffBadge] ${badgeId}: ${totalAwarded}명 부여 완료`);
  }
);

// ── 점수 업데이트 시 즉시 뱃지 체크 (선택적 트리거) ─────────────────────────
// 클라이언트에서도 처리하지만 서버 검증이 필요할 때 활성화

export const onScoreUpdate = functions.firestore.onDocumentUpdated(
  {
    document: 'users/{uid}',
    region: 'asia-northeast3',
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after  = event.data?.after?.data();
    if (!before || !after) return;

    const prevScore: number = before.sheriff_score ?? 0;
    const newScore:  number = after.sheriff_score  ?? 0;
    if (newScore <= prevScore) return; // 점수가 증가한 경우만

    const uid = event.params.uid;
    const milestones = [
      { threshold: 100,  badgeId: 'neighborhood_resident' },
      { threshold: 300,  badgeId: 'regular_visitor' },
      { threshold: 600,  badgeId: 'local_legend' },
      { threshold: 1000, badgeId: 'local_influencer' },
      { threshold: 2000, badgeId: 'sheriff_candidate' },
    ];

    const currentBadges: string[] = after.badge_list ?? [];
    const toAward = milestones
      .filter(({ threshold, badgeId }) =>
        newScore >= threshold && !currentBadges.includes(badgeId)
      )
      .map(({ badgeId }) => badgeId);

    if (toAward.length === 0) return;

    await db.collection('users').doc(uid).update({
      badge_list: admin.firestore.FieldValue.arrayUnion(...toAward),
    });

    functions.logger.info(`[onScoreUpdate] uid=${uid} 뱃지 부여:`, toAward);
  }
);

// ── 유료 API 호출 한도 (과금 남용 방지) ─────────────────────────────────────────
// uid별로 하루 호출 횟수를 Firestore 트랜잭션으로 세어, 초과 시 거절한다.
// App Check 같은 클라이언트 증명 계층은 아니지만, 로그인 계정만으로 무한 반복
// 호출해 Kakao Mobility/ODSay API 과금을 늘리는 시나리오는 이걸로 막힌다.

async function checkAndIncrementDailyLimit(
  uid: string,
  field: string,
  maxCount: number,
): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC 기준, 대략적인 일일 경계)
  const ref = db.collection('users').doc(uid).collection('daily_stats').doc(today);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current: number = snap.exists ? (snap.data()?.[field] ?? 0) : 0;
    if (current >= maxCount) return false;
    tx.set(ref, { [field]: current + 1, updated_at: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
}

// ── 카카오 길찾기 프록시 ────────────────────────────────────────────────────────
// Kakao Mobility REST 키를 서버에만 보관하고 클라이언트에 노출하지 않는다.

export const kakaoDirections = onCall(
  { region: 'asia-northeast3' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', '로그인이 필요합니다');

    const allowed = await checkAndIncrementDailyLimit(request.auth.uid, 'directions_calls', 50);
    if (!allowed) {
      throw new HttpsError('resource-exhausted', '오늘 경로 탐색 횟수를 초과했어요. 내일 다시 시도해주세요.');
    }

    const { originLng, originLat, destLng, destLat } = request.data as {
      originLng: number; originLat: number;
      destLng: number; destLat: number;
    };

    if (
      !isFinite(originLat) || !isFinite(originLng) ||
      !isFinite(destLat)   || !isFinite(destLng)
    ) {
      throw new HttpsError('invalid-argument', '좌표가 올바르지 않습니다');
    }

    const key = process.env.KAKAO_REST_KEY;
    if (!key) throw new HttpsError('internal', 'KAKAO_REST_KEY not configured');

    const url =
      `https://apis-navi.kakaomobility.com/v1/directions` +
      `?origin=${originLng},${originLat}` +
      `&destination=${destLng},${destLat}` +
      `&priority=RECOMMEND`;

    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
    });
    if (!res.ok) throw new HttpsError('internal', `Kakao HTTP ${res.status}`);

    const json = await res.json() as {
      routes?: Array<{
        result_code: number;
        summary: { duration: number; distance: number; fare?: { taxi?: number } };
        sections?: Array<{ roads?: Array<{ vertexes: number[] }> }>;
      }>;
    };
    const route = json.routes?.[0];

    if (!route || route.result_code !== 0) {
      return { found: false as const };
    }

    const { duration, distance, fare } = route.summary;
    const vertexes: number[] = [];
    route.sections?.forEach((section) => {
      section.roads?.forEach((road) => {
        road.vertexes.forEach(v => vertexes.push(v));
      });
    });

    return {
      found: true as const,
      duration,
      distance,
      taxiFare: fare?.taxi ?? null,
      vertexes,
    };
  }
);

// ── ODSay 대중교통 경로 프록시 ───────────────────────────────────────────────────
// ODSay API 키를 서버에만 보관하고 클라이언트 번들에 노출하지 않는다.

export const odsayDirections = onCall(
  { region: 'asia-northeast3' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', '로그인이 필요합니다');

    const allowed = await checkAndIncrementDailyLimit(request.auth.uid, 'transit_directions_calls', 50);
    if (!allowed) {
      throw new HttpsError('resource-exhausted', '오늘 경로 탐색 횟수를 초과했어요. 내일 다시 시도해주세요.');
    }

    const { originLng, originLat, destLng, destLat } = request.data as {
      originLng: number; originLat: number;
      destLng: number; destLat: number;
    };

    if (
      !isFinite(originLat) || !isFinite(originLng) ||
      !isFinite(destLat)   || !isFinite(destLng)
    ) {
      throw new HttpsError('invalid-argument', '좌표가 올바르지 않습니다');
    }

    const isIos = (request.data as { platform?: string }).platform === 'ios';
    const key = isIos
      ? process.env.ODSAY_API_KEY_IOS
      : process.env.ODSAY_API_KEY_ANDROID;
    if (!key) throw new HttpsError('internal', 'ODSAY_API_KEY not configured');

    const url =
      `https://api.odsay.com/v1/api/searchPubTransPathT` +
      `?SX=${originLng}&SY=${originLat}` +
      `&EX=${destLng}&EY=${destLat}` +
      `&apiKey=${encodeURIComponent(key)}`;

    const res = await fetch(url);
    if (!res.ok) throw new HttpsError('internal', `ODSay HTTP ${res.status}`);

    const json = await res.json() as {
      error?: { message?: string };
      result?: { path?: unknown[] };
    };
    if (json.error) throw new HttpsError('internal', json.error.message ?? 'ODSay 오류');

    return json;
  }
);

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function extractGu(address: string): string | null {
  // "서울특별시 종로구 청운동" → "종로구"
  // "경기도 성남시 분당구 ..." → "분당구"
  const match = address.match(/(\S+구|\S+군|\S+시)/);
  return match?.[1] ?? null;
}
