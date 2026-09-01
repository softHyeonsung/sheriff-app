import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatRoom, getUserProfile, subscribeToRooms, UserProfile } from '../../src/api/chat';
import { useAuthStore } from '../../src/store/authStore';

function formatTime(ts: ChatRoom['last_message_at']) {
  if (!ts) return '';
  const d = new Date(ts.seconds * 1000);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (diffDays < 7) return `${diffDays}일 전`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const firebaseUser = useAuthStore((s) => s.user);
  const kakaoUser = useAuthStore((s) => s.kakaoUser);
  const myUid = firebaseUser?.uid ?? (kakaoUser ? `kakao_${kakaoUser.id}` : '');

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});

  useEffect(() => {
    if (!myUid) return;
    return subscribeToRooms(myUid, async (newRooms) => {
      setRooms(newRooms);
      const toFetch = [
        ...new Set(
          newRooms
            .filter((r) => r.room_type === 'dm')
            .flatMap((r) => r.members.filter((uid) => uid !== myUid))
        ),
      ];
      const fetched: Record<string, UserProfile> = {};
      await Promise.all(
        toFetch.map(async (uid) => {
          const p = await getUserProfile(uid);
          if (p) fetched[uid] = p;
        })
      );
      setProfiles((prev) => ({ ...prev, ...fetched }));
    });
  }, [myUid]);

  const getRoomDisplay = (room: ChatRoom) => {
    if (room.room_type === 'dm') {
      const otherUid = room.members.find((uid) => uid !== myUid) ?? '';
      const profile = profiles[otherUid];
      return {
        title: profile?.nickname ?? '상대방',
        initial: (profile?.nickname ?? '?')[0].toUpperCase(),
        color: '#FFAC30',
      };
    }
    return {
      title: '모임 채팅',
      initial: 'G',
      color: '#4CAF6A',
    };
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>채팅</Text>
        <TouchableOpacity
          onPress={() => router.push('/dm/new' as any)}
          style={styles.composeBtn}
          accessibilityLabel="새 메시지"
        >
          <Ionicons name="create-outline" size={24} color="#1A1108" />
        </TouchableOpacity>
      </View>

      {rooms.length === 0 ? (
        <View style={[styles.emptyWrap, { paddingBottom: insets.bottom + 96 }]}>
          <View style={styles.iconWrap}>
            <Ionicons name="send" size={40} color="#FFAC30" />
          </View>
          <Text style={styles.emptyTitle}>채팅방이 없어요</Text>
          <Text style={styles.emptySub}>
            새 메시지 버튼을 눌러{'\n'}대화를 시작해보세요
          </Text>
          <TouchableOpacity
            style={styles.cta}
            onPress={() => router.push('/dm/new' as any)}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>새 메시지 보내기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.room_id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          renderItem={({ item }) => {
            const { title, initial, color } = getRoomDisplay(item);
            return (
              <TouchableOpacity
                style={styles.roomRow}
                onPress={() => router.push(`/dm/${item.room_id}` as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.avatar, { backgroundColor: color }]}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.roomInfo}>
                  <View style={styles.roomTopRow}>
                    <Text style={styles.roomTitle} numberOfLines={1}>{title}</Text>
                    {(item.unread_counts?.[myUid] ?? 0) > 0 && (
                      <View style={styles.unreadDot} />
                    )}
                    <Text style={styles.roomTime}>{formatTime(item.last_message_at)}</Text>
                  </View>
                  <Text style={styles.lastMsg} numberOfLines={1}>
                    {item.last_message || '메시지가 없어요'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D4',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  composeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    shadowColor: '#1A1108',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    marginBottom: 10,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  cta: {
    backgroundColor: '#FFAC30',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#1A1108',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  ctaText: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 20,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  roomInfo: { flex: 1 },
  roomTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  roomTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
    marginRight: 8,
  },
  roomTime: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
  },
  lastMsg: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
  },
  sep: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginLeft: 84,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFAC30',
    marginRight: 6,
    alignSelf: 'center',
  },
});
