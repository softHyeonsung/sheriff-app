import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOrCreateDMRoom, sendMessage } from '../api/chat';
import { FollowUserProfile, fetchFollowing } from '../api/users';

interface Props {
  visible: boolean;
  onClose: () => void;
  myUid: string;
  shareText: string;
}

export default function ShareModal({ visible, onClose, myUid, shareText }: Props) {
  const insets = useSafeAreaInsets();
  const [following, setFollowing] = useState<FollowUserProfile[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentUids, setSentUids] = useState<string[]>([]);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !myUid) return;
    setLoading(true);
    setQuery('');
    setSentUids([]);
    fetchFollowing(myUid)
      .then(setFollowing)
      .catch(() => setFollowing([]))
      .finally(() => setLoading(false));
  }, [visible, myUid]);

  const filtered = following.filter((u) =>
    u.nickname.toLowerCase().includes(query.toLowerCase())
  );

  const handleSend = async (targetUid: string) => {
    if (sending || sentUids.includes(targetUid)) return;
    setSending(targetUid);
    try {
      const roomId = await getOrCreateDMRoom(myUid, targetUid);
      await sendMessage(roomId, myUid, shareText);
      setSentUids((prev) => [...prev, targetUid]);
    } finally {
      setSending(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={s.handle} />
        <View style={s.header}>
          <Text style={s.title}>공유하기</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color="#1A1108" />
          </TouchableOpacity>
        </View>

        <TextInput
          style={s.search}
          placeholder="팔로잉 검색"
          placeholderTextColor="#9A9A9A"
          value={query}
          onChangeText={setQuery}
        />

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color="#FFAC30" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.uid}
            style={s.list}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={s.sep} />}
            ListEmptyComponent={
              <View style={s.center}>
                <Ionicons name="people-outline" size={36} color="#D4D4D4" style={{ marginBottom: 8 }} />
                <Text style={s.emptyText}>
                  {following.length === 0 ? '팔로잉하는 사람이 없어요' : '검색 결과가 없어요'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const sent = sentUids.includes(item.uid);
              const isSending = sending === item.uid;
              return (
                <View style={s.row}>
                  <View style={s.avatar}>
                    <Ionicons name="person" size={20} color="#1A1108" />
                  </View>
                  <Text style={s.nickname} numberOfLines={1}>{item.nickname}</Text>
                  <TouchableOpacity
                    style={[s.sendBtn, sent && s.sentBtn]}
                    onPress={() => handleSend(item.uid)}
                    disabled={sent || !!sending}
                    activeOpacity={0.75}
                  >
                    {isSending ? (
                      <ActivityIndicator size="small" color="#1A1108" />
                    ) : (
                      <Text style={[s.sendBtnText, sent && s.sentBtnText]}>
                        {sent ? '전송됨' : '보내기'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  search: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  list: { maxHeight: 360 },
  sep: { height: 1, backgroundColor: '#F5F5F5' },
  center: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9A9A9A',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  nickname: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#1A1108',
    marginRight: 8,
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFAC30',
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
  },
  sentBtn: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  sendBtnText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  sentBtnText: {
    color: '#9A9A9A',
    fontFamily: 'AppleSDGothicNeo-Regular',
  },
});
