import { Alert } from 'react-native';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export type ReportTargetType = 'post' | 'user' | 'comment';

export type ReportReason =
  | 'spam'       // 스팸/광고
  | 'abuse'      // 욕설/혐오
  | 'inappropriate' // 부적절한 콘텐츠
  | 'other';     // 기타

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: '스팸/광고',
  abuse: '욕설/혐오',
  inappropriate: '부적절한 콘텐츠',
  other: '기타',
};

export async function reportContent(
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
  reason: ReportReason,
  detail?: string,
): Promise<void> {
  await addDoc(collection(db, 'reports'), {
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason,
    detail: detail ?? '',
    status: 'pending',
    created_at: serverTimestamp(),
  });
}

// 신고 사유 선택 → 접수까지 한 번에 처리하는 공용 UI 헬퍼 (게시물 상세, 유저 프로필 등에서 재사용)
export function promptAndReport(
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
): void {
  const reasons: ReportReason[] = ['spam', 'abuse', 'inappropriate', 'other'];
  Alert.alert(
    '신고하기',
    '신고 사유를 선택해주세요.',
    [
      ...reasons.map((reason) => ({
        text: REPORT_REASON_LABELS[reason],
        onPress: () => {
          reportContent(reporterId, targetType, targetId, reason)
            .then(() => Alert.alert('신고 접수됨', '신고가 접수됐어요. 검토 후 조치할게요.'))
            .catch(() => Alert.alert('오류', '신고 접수에 실패했어요. 다시 시도해주세요.'));
        },
      })),
      { text: '취소', style: 'cancel' },
    ],
  );
}
