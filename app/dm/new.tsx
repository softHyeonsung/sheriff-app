import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOrCreateDMRoom, searchUsers, UserProfile } from '../../src/api/chat';
import { useAuthStore } from '../../src/store/authStore';

export default function NewDMScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const firebaseUser = useAuthStore((s) => s.user);
  const kakaoUser = useAuthStore((s) => s.kakaoUser);
  const myUid = firebaseUser?.uid ?? (kakaoUser ? `kakao_${kakaoUser.id}` : '');

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const found = await searchUsers(text, myUid);
      setResults(found);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (other: UserProfile) => {
    if (!myUid || starting) return;
    setStarting(true);
    try {
      const roomId = await getOrCreateDMRoom(myUid, other.uid);
      router.replace(`/dm/${roomId}` as any);
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '채팅방을 만들 수 없어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color="#1A1108" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>새 메시지</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color="#7A5C38" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="닉네임으로 검색"
          placeholderTextColor="#7A5C38"
          autoFocus
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color="#FFAC30" />}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          searchQuery.trim() && !loading ? (
            <Text style={styles.emptyText}>검색 결과가 없어요</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userRow}
            onPress={() => handleSelect(item)}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.nickname[0] ?? '?').toUpperCase()}</Text>
            </View>
            <Text style={styles.nickname}>{item.nickname}</Text>
            <Ionicons name="chevron-forward" size={16} color="#D4D4D4" />
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D4',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 22,
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
  },
  list: { paddingHorizontal: 16 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFAC30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  nickname: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
  },
  sep: { height: 1, backgroundColor: '#F5F5F5' },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
    marginTop: 40,
  },
});
