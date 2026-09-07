// 회원가입 시 표시하는 약관 동의 섹션 — 이용약관 / 개인정보 처리방침 / 위치기반서비스 이용약관(위치정보 수집·이용)
// 원스토어 상품 검증 반려 사유(위치정보 수집·활용 고지 및 동의 절차 미구현) 대응
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface TermsAgreementValues {
  terms: boolean;
  privacy: boolean;
  location: boolean;
}

export const REQUIRED_TERMS_KEYS: (keyof TermsAgreementValues)[] = ['terms', 'privacy', 'location'];

export function isAllRequiredAgreed(v: TermsAgreementValues): boolean {
  return REQUIRED_TERMS_KEYS.every((k) => v[k]);
}

const TERMS_TEXT = `제1조 (목적)
본 약관은 '보안관'(이하 "서비스")의 이용조건 및 절차, 회원과 운영자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (게시물 및 콘텐츠 관리)
1. 회원은 타인의 권리를 침해하거나 법령에 위반되는 게시물을 등록할 수 없습니다.
2. 운영자는 신고 접수 또는 자체 모니터링을 통해 아래에 해당하는 게시물·계정에 대해 삭제, 이용 제한, 강제 탈퇴 등의 조치를 취할 수 있습니다.
   - 욕설, 혐오, 명예훼손, 성적 수치심을 유발하는 콘텐츠
   - 스팸, 광고, 사기성 게시물
   - 개인정보 무단 노출
   - 기타 관계 법령 및 서비스 운영정책에 반하는 행위
3. 회원은 부적절한 게시물이나 회원을 신고할 수 있으며, 신고된 내용은 운영자 검토 후 처리됩니다.

제3조 (서비스의 변경 및 중단)
운영자는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.

제4조 (면책)
운영자는 회원이 게시한 콘텐츠의 신뢰성, 정확성에 대해 보증하지 않으며, 회원 간 오프라인 모임·거래로 발생한 분쟁에 대해 책임을 지지 않습니다.`;

const PRIVACY_TEXT = `수집 항목: 이메일, 닉네임, 프로필 이미지, 위치정보(GPS 좌표), 게시물·사진·채팅 등 이용자가 직접 등록하는 콘텐츠

수집 목적: 회원 식별, 지도 기반 동네 콘텐츠 제공, 모임·퀘스트 매칭, 채팅, 보안관 점수·뱃지 산정

보유 기간: 회원 탈퇴 시까지 (탈퇴 즉시 파기, 관계 법령상 보존 의무가 있는 경우 해당 기간 보관)

제3자 제공(처리 위탁): Google Firebase(인증·저장·알림), 카카오(로그인·지도), 한국관광공사 TourAPI(주변 관광정보 조회)

이용자는 앱 내 프로필 설정에서 언제든 정보를 조회·수정할 수 있고, 회원 탈퇴로 삭제를 요청할 수 있습니다.

전체 개인정보처리방침: github.com/softHyeonsung/sheriff-app (docs/store/privacy-policy.md)`;

const LOCATION_TEXT = `보안관은 지도 중심의 하이퍼로컬 서비스로, 아래와 같이 위치정보를 수집·이용합니다.

수집하는 위치정보: 단말기 GPS를 통한 현재 위치 좌표(위도/경도)

수집 방법: Android는 Google 위치 서비스(Fused Location Provider), iOS는 Apple Core Location을 통해 단말기에서 직접 수집

이용 목적:
- 현재 위치 주변의 게시물·추천 장소·모임 정보를 지도에 표시
- 게시물 작성 시 장소 태깅, 모임 생성 시 모임 장소 지정
- 근처 관광정보 조회(한국관광공사 TourAPI), 지도·장소 검색(카카오맵)

보유 및 파기: 실시간 조회 목적으로만 사용하며 별도 위치 이력을 서버에 저장하지 않습니다. 게시물·모임에 직접 태그한 장소 좌표는 해당 게시물·모임 삭제 시 함께 삭제됩니다.

동의 거부 권리: 위치정보 수집에 동의하지 않을 수 있으나, 이 경우 지도 기반 핵심 기능(주변 콘텐츠 노출, 거리 표시 등) 이용이 제한됩니다.

위치정보관리책임자: 권현성 (mintkhs1013@gmail.com)`;

const DOCS: Record<keyof TermsAgreementValues, { title: string; body: string }> = {
  terms:    { title: '이용약관', body: TERMS_TEXT },
  privacy:  { title: '개인정보 처리방침', body: PRIVACY_TEXT },
  location: { title: '위치기반서비스 이용약관 (위치정보 수집·이용 동의)', body: LOCATION_TEXT },
};

const ROWS: { key: keyof TermsAgreementValues; label: string }[] = [
  { key: 'terms',    label: '[필수] 이용약관 동의' },
  { key: 'privacy',  label: '[필수] 개인정보 처리방침 동의' },
  { key: 'location', label: '[필수] 위치기반서비스 이용약관 및 위치정보 수집·이용 동의' },
];

interface Props {
  values: TermsAgreementValues;
  onChange: (values: TermsAgreementValues) => void;
}

export default function TermsAgreementSection({ values, onChange }: Props) {
  const [viewingDoc, setViewingDoc] = useState<keyof TermsAgreementValues | null>(null);
  const allAgreed = isAllRequiredAgreed(values);

  const toggle = (key: keyof TermsAgreementValues) => {
    onChange({ ...values, [key]: !values[key] });
  };

  const toggleAll = () => {
    const next = !allAgreed;
    onChange({ terms: next, privacy: next, location: next });
  };

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.allRow} onPress={toggleAll} accessibilityRole="checkbox" accessibilityState={{ checked: allAgreed }}>
        <Ionicons
          name={allAgreed ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={allAgreed ? '#FFAC30' : '#B89060'}
        />
        <Text style={s.allLabel}>약관 전체 동의</Text>
      </TouchableOpacity>

      <View style={s.divider} />

      {ROWS.map(({ key, label }) => (
        <View key={key} style={s.row}>
          <TouchableOpacity
            style={s.rowMain}
            onPress={() => toggle(key)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: values[key] }}
            accessibilityLabel={label}
          >
            <Ionicons
              name={values[key] ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={values[key] ? '#FFAC30' : '#B89060'}
            />
            <Text style={s.rowLabel}>{label}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewingDoc(key)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.viewLink}>보기</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Modal visible={viewingDoc !== null} transparent animationType="slide" onRequestClose={() => setViewingDoc(null)}>
        <Pressable style={s.backdrop} onPress={() => setViewingDoc(null)} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{viewingDoc ? DOCS[viewingDoc].title : ''}</Text>
            <TouchableOpacity onPress={() => setViewingDoc(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color="#1A1108" />
            </TouchableOpacity>
          </View>
          <ScrollView style={s.sheetBody} showsVerticalScrollIndicator={false}>
            <Text style={s.sheetText}>{viewingDoc ? DOCS[viewingDoc].body : ''}</Text>
          </ScrollView>
          {viewingDoc && (
            <TouchableOpacity
              style={s.agreeBtn}
              onPress={() => {
                onChange({ ...values, [viewingDoc]: true });
                setViewingDoc(null);
              }}
            >
              <Text style={s.agreeBtnText}>동의합니다</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    padding: 14,
    marginBottom: 16,
  },
  allRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  allLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
  },
  divider: { height: 1, backgroundColor: '#D4D4D4', marginVertical: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowLabel: {
    marginLeft: 8,
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    flexShrink: 1,
  },
  viewLink: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
    textDecorationLine: 'underline',
    marginLeft: 8,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4D4D4',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    flex: 1,
    marginRight: 12,
  },
  sheetBody: { marginBottom: 16 },
  sheetText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
  },
  agreeBtn: {
    height: 48,
    backgroundColor: '#FFAC30',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agreeBtnText: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
});
