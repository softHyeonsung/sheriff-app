import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import KOREA_DISTRICTS from '../src/constants/koreaDistricts';
import { useAuthStore } from '../src/store/authStore';

type PickerStep = 'province' | 'district' | 'dong';

export default function ProfileSetupScreen() {
  const router             = useRouter();
  const kakaoUser          = useAuthStore((s) => s.kakaoUser);
  const setProfileComplete = useAuthStore((s) => s.setProfileComplete);
  const setStoreNickname   = useAuthStore((s) => s.setNickname);

  const [nickname,   setNickname]   = useState(kakaoUser?.nickname ?? '');
  const [saving,     setSaving]     = useState(false);

  // 3-step address
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedDong,     setSelectedDong]     = useState('');
  const [pickerStep,       setPickerStep]       = useState<PickerStep>('province');
  const [showPicker,       setShowPicker]       = useState(false);

  const PROVINCES  = Object.keys(KOREA_DISTRICTS);
  const DISTRICTS  = selectedProvince ? Object.keys(KOREA_DISTRICTS[selectedProvince] ?? {}) : [];
  const DONGS      = (selectedProvince && selectedDistrict)
    ? (KOREA_DISTRICTS[selectedProvince]?.[selectedDistrict] ?? [])
    : [];

  const fullAddress = [selectedProvince, selectedDistrict, selectedDong].filter(Boolean).join(' ');

  // Prefill nickname from Firestore for email/Google/Apple users
  useEffect(() => {
    if (nickname) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDoc(doc(db, 'users', uid)).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data?.nickname && !nickname) setNickname(data.nickname);
    }).catch(() => {});
  }, []);

  const openPicker = () => {
    setPickerStep('province');
    setShowPicker(true);
  };

  const handleProvinceSelect = (item: string) => {
    setSelectedProvince(item);
    setSelectedDistrict('');
    setSelectedDong('');
    setPickerStep('district');
  };

  const handleDistrictSelect = (item: string) => {
    setSelectedDistrict(item);
    setSelectedDong('');
    const dongs = KOREA_DISTRICTS[selectedProvince]?.[item] ?? [];
    if (dongs.length > 0) {
      setPickerStep('dong');
    } else {
      setShowPicker(false);
    }
  };

  const handleDongSelect = (item: string) => {
    setSelectedDong(item);
    setShowPicker(false);
  };

  const pickerTitle = pickerStep === 'province' ? '시·도 선택'
    : pickerStep === 'district' ? '시·군·구 선택'
    : '읍·면·동 선택';

  const pickerData = pickerStep === 'province' ? PROVINCES
    : pickerStep === 'district' ? DISTRICTS
    : DONGS;

  const handlePickerItem = (item: string) => {
    if (pickerStep === 'province') handleProvinceSelect(item);
    else if (pickerStep === 'district') handleDistrictSelect(item);
    else handleDongSelect(item);
  };

  const currentSelected = pickerStep === 'province' ? selectedProvince
    : pickerStep === 'district' ? selectedDistrict
    : selectedDong;

  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('닉네임을 입력해주세요.');
      return;
    }
    if (!selectedProvince || !selectedDistrict || !selectedDong) {
      Alert.alert('거주 지역을 읍·면·동 단위까지 선택해주세요.');
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
        home_address:     fullAddress,
        profile_complete: true,
      });
      setProfileComplete(true);
      setStoreNickname(nickname.trim());
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
          placeholderTextColor="#B89060"
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
        <TouchableOpacity style={styles.regionBtn} onPress={openPicker}>
          <Text style={[styles.regionBtnText, !fullAddress && styles.placeholder]}>
            {fullAddress || '지역을 선택하세요'}
          </Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
        {(selectedProvince || selectedDistrict || selectedDong) && (
          <View style={styles.breadcrumb}>
            {selectedProvince ? (
              <TouchableOpacity onPress={() => { setPickerStep('province'); setShowPicker(true); }}>
                <Text style={styles.breadcrumbItem}>{selectedProvince}</Text>
              </TouchableOpacity>
            ) : null}
            {selectedDistrict ? (
              <>
                <Text style={styles.breadcrumbSep}> › </Text>
                <TouchableOpacity onPress={() => { setPickerStep('district'); setShowPicker(true); }}>
                  <Text style={styles.breadcrumbItem}>{selectedDistrict}</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {selectedDong ? (
              <>
                <Text style={styles.breadcrumbSep}> › </Text>
                <Text style={[styles.breadcrumbItem, styles.breadcrumbFinal]}>{selectedDong}</Text>
              </>
            ) : null}
          </View>
        )}
      </View>

      {/* 시작 버튼 */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.disabledBtn]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '보안관 시작하기'}</Text>
      </TouchableOpacity>

      {/* 3-step 지역 선택 모달 */}
      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{pickerTitle}</Text>
            <FlatList
              data={pickerData}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.regionItem, item === currentSelected && styles.regionItemSelected]}
                  onPress={() => handlePickerItem(item)}
                >
                  <Text style={[styles.regionItemText, item === currentSelected && styles.regionItemTextSelected]}>
                    {item}
                  </Text>
                  {item === currentSelected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPicker(false)}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
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
    color: '#7A5C38',
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
    color: '#B89060',
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
    flex: 1,
  },
  placeholder: {
    color: '#B89060',
  },
  arrow: {
    fontSize: 20,
    color: '#B89060',
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
    flexWrap: 'wrap',
  },
  breadcrumbItem: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#FFAC30',
    textDecorationLine: 'underline',
  },
  breadcrumbFinal: {
    textDecorationLine: 'none',
    color: '#1A1108',
    fontFamily: 'AppleSDGothicNeo-SemiBold',
  },
  breadcrumbSep: {
    fontSize: 13,
    color: '#B89060',
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
    paddingBottom: 16,
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
  cancelBtn: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#B89060',
  },
});
