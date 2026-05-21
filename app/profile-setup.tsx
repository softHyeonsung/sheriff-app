import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../src/firebaseConfig';
import { useAuthStore } from '../src/store/authStore';

const PROVINCES = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시',
  '광주광역시', '대전광역시', '울산광역시', '세종특별자치시',
  '경기도', '강원특별자치도', '충청북도', '충청남도',
  '전라북도', '전라남도', '경상북도', '경상남도', '제주특별자치도',
];

export default function ProfileSetupScreen() {
  const router            = useRouter();
  const kakaoUser         = useAuthStore((s) => s.kakaoUser);
  const setProfileComplete = useAuthStore((s) => s.setProfileComplete);

  const [nickname,   setNickname]   = useState(kakaoUser?.nickname ?? '');
  const [region,     setRegion]     = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [saving,     setSaving]     = useState(false);

  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('닉네임을 입력해주세요.');
      return;
    }
    if (!region) {
      Alert.alert('거주 지역을 선택해주세요.');
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert('오류', '로그인 정보를 찾을 수 없어요. 다시 로그인해주세요.');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', uid), {
        nickname:         nickname.trim(),
        home_address:     region,
        profile_complete: true,
      });
      setProfileComplete(true);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('저장 실패', e?.message ?? '잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>프로필 설정</Text>
        <Text style={styles.subtitle}>보안관 활동을 시작하기 위해{'\n'}기본 정보를 입력해주세요</Text>
      </View>

      {/* 닉네임 */}
      <View style={styles.field}>
        <Text style={styles.label}>
          닉네임 <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="사용할 닉네임을 입력하세요"
          placeholderTextColor="#9E9E9E"
          maxLength={20}
          returnKeyType="done"
        />
        <Text style={styles.hint}>{nickname.length}/20</Text>
      </View>

      {/* 거주 지역 */}
      <View style={styles.field}>
        <Text style={styles.label}>
          거주 지역 <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity style={styles.regionBtn} onPress={() => setShowPicker(true)}>
          <Text style={[styles.regionBtnText, !region && styles.placeholder]}>
            {region || '지역을 선택하세요'}
          </Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 시작 버튼 */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.disabledBtn]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '보안관 시작하기'}</Text>
      </TouchableOpacity>

      {/* 지역 선택 모달 */}
      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>거주 지역 선택</Text>
            <FlatList
              data={PROVINCES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.regionItem, region === item && styles.regionItemSelected]}
                  onPress={() => { setRegion(item); setShowPicker(false); }}
                >
                  <Text style={[styles.regionItemText, region === item && styles.regionItemTextSelected]}>
                    {item}
                  </Text>
                  {region === item && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
    paddingTop: 80,
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontFamily: 'AppleSDGothicNeo-Heavy',
    color: '#1A1108',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#6B6B6B',
    lineHeight: 22,
  },
  field: {
    marginBottom: 28,
  },
  label: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
    marginBottom: 8,
  },
  required: {
    color: '#FFAC30',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    color: '#1A1108',
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
  },
  hint: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9E9E9E',
    textAlign: 'right',
    marginTop: 4,
  },
  regionBtn: {
    height: 52,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  regionBtnText: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
  },
  placeholder: {
    color: '#9E9E9E',
  },
  arrow: {
    fontSize: 20,
    color: '#9E9E9E',
  },
  saveBtn: {
    height: 54,
    backgroundColor: '#FFAC30',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#1A1108',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '75%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D4D4D4',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    textAlign: 'center',
    marginBottom: 12,
  },
  regionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  regionItemSelected: {
    backgroundColor: '#FFFBF0',
  },
  regionItemText: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
  },
  regionItemTextSelected: {
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#FFAC30',
  },
  checkmark: {
    fontSize: 16,
    color: '#FFAC30',
    fontFamily: 'AppleSDGothicNeo-Bold',
  },
});
