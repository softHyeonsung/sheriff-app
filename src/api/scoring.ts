import {
  arrayUnion,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { SCORE_MILESTONE_BADGES } from '../constants/badges';

// ── 등급 체계 ─────────────────────────────────────────────────────────────────

export function computeRankLevel(score: number): string {
  if (score >= 2000) return '보안관 후보';
  if (score >= 1000) return '지역 인플루언서';
  if (score >= 600)  return '동네 터줏대감';
  if (score >= 300)  return '단골손님';
  if (score >= 100)  return '동네 주민';
  return '새내기';
}

// ── 뱃지 부여 (이미 있으면 no-op) ────────────────────────────────────────────

export async function checkAndAwardBadge(uid: string, badgeId: string): Promise<boolean> {
  const ref = doc(db, 'users', uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const current: string[] = snap.data().badge_list ?? [];
    if (current.includes(badgeId)) return false;
    await updateDoc(ref, { badge_list: arrayUnion(badgeId) });
    return true;
  } catch {
    return false;
  }
}

async function checkScoreMilestoneBadges(uid: string, newScore: number): Promise<void> {
  const applicable = SCORE_MILESTONE_BADGES.filter(({ threshold }) => newScore >= threshold);
  await Promise.all(applicable.map(({ badgeId }) => checkAndAwardBadge(uid, badgeId)));
}

// ── 점수 추가 (rank_level + 마일스톤 뱃지 자동 갱신) ────────────────────────

export async function addScore(uid: string, points: number): Promise<void> {
  const userRef = doc(db, 'users', uid);
  let newScore = 0;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) return;
    newScore = Math.max(0, (snap.data().sheriff_score ?? 0) + points);
    tx.update(userRef, {
      sheriff_score: newScore,
      rank_level: computeRankLevel(newScore),
    });
  }).catch(() => {});
  if (newScore > 0) {
    await checkScoreMilestoneBadges(uid, newScore);
  }
}

// ── 일일 한도 체크 + 증가 ─────────────────────────────────────────────────────

const todayKey = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

export async function checkAndIncrementDaily(
  uid: string,
  field: string,
  maxCount: number,
): Promise<boolean> {
  const ref = doc(db, 'users', uid, 'daily_stats', todayKey());
  let allowed = false;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current: number = snap.exists() ? (snap.data()[field] ?? 0) : 0;
    if (current < maxCount) {
      allowed = true;
      tx.set(ref, { [field]: current + 1, updated_at: serverTimestamp() }, { merge: true });
    }
  }).catch(() => {});
  return allowed;
}

// ── 장소 최초 저장 추적 ───────────────────────────────────────────────────────

export async function trackPlaceSave(
  uid: string,
  placeId: string,
  placeName: string,
): Promise<void> {
  const ref = doc(db, 'place_saves', placeId);
  let isFirst = false;
  let firstSaverUid: string | null = null;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      isFirst = true;
      tx.set(ref, { place_id: placeId, place_name: placeName, first_saver_uid: uid, save_count: 1 });
    } else {
      const data = snap.data();
      firstSaverUid = data.first_saver_uid ?? null;
      tx.update(ref, { save_count: (data.save_count ?? 0) + 1 });
    }
  }).catch(() => {});

  if (isFirst) {
    await addScore(uid, 15);
  } else if (firstSaverUid && firstSaverUid !== uid) {
    await addScore(firstSaverUid, 3);
  }
}

// ── 주거지 인증 (최초 1회 +50 + 뱃지) ───────────────────────────────────────

export async function verifyHome(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  let verified = false;
  let newScore = 0;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) return;
    if (snap.data().is_home_verified) return;
    verified = true;
    newScore = Math.max(0, (snap.data().sheriff_score ?? 0) + 50);
    tx.update(userRef, {
      is_home_verified: true,
      sheriff_score: newScore,
      rank_level: computeRankLevel(newScore),
    });
  }).catch(() => {});
  if (verified) {
    await checkAndAwardBadge(uid, 'home_verified');
    await checkScoreMilestoneBadges(uid, newScore);
  }
}
