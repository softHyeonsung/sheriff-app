// 경로: app/notifications.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppNotification,
  markNotificationRead,
  subscribeNotifications,
} from '../src/api/notifications';
import { useAuthStore } from '../src/store/authStore';

const ICONS: Record<AppNotification['type'], keyof typeof Ionicons.glyphMap> = {
  join_request: 'person-add-outline',
  join_approved: 'checkmark-circle-outline',
  join_rejected: 'close-circle-outline',
  comment: 'chatbubble-outline',
};

function formatTimeAgo(ts: AppNotification['created_at']): string {
  if (!ts) return '';
  const diff = Date.now() - ts.seconds * 1000;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const firebaseUser = useAuthStore((s) => s.user);
  const kakaoUser    = useAuthStore((s) => s.kakaoUser);
  const uid = firebaseUser?.uid ?? (kakaoUser ? `kakao_${kakaoUser.id}` : null);

  const [notifs, setNotifs] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!uid) return;
    return subscribeNotifications(uid, setNotifs);
  }, [uid]);

  const handlePress = (n: AppNotification) => {
    if (!n.read) markNotificationRead(uid!, n.id).catch(() => {});
    if (n.type === 'comment') {
      router.push(`/post/${n.related_id}` as any);
    } else {
      router.push(`/gathering/${n.related_id}` as any);
    }
  };

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={s.headerIconBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={26} color="#1A1108" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>알림</Text>
        <View style={s.headerIconBtn} />
      </View>

      <FlatList
        data={notifs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={notifs.length === 0 && s.emptyContainer}
        ItemSeparatorComponent={() => <View style={s.sep} />}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Ionicons name="notifications-outline" size={40} color="#D4D4D4" />
            <Text style={s.emptyText}>아직 알림이 없어요</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.row, !item.read && s.rowUnread]}
            onPress={() => handlePress(item)}
            activeOpacity={0.75}
          >
            <View style={s.iconWrap}>
              <Ionicons name={ICONS[item.type]} size={20} color="#FFAC30" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.body} numberOfLines={2}>{item.body}</Text>
              <Text style={s.time}>{formatTimeAgo(item.created_at)}</Text>
            </View>
            {!item.read && <View style={s.unreadDot} />}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  headerIconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'AppleSDGothicNeo-Bold', color: '#1A1108' },
  sep: { height: 1, backgroundColor: '#F5F5F5' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  rowUnread: { backgroundColor: '#FFFBF2' },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF8EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 14, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#1A1108' },
  body: { fontSize: 13, fontFamily: 'AppleSDGothicNeo-Regular', color: '#1A1108', marginTop: 2 },
  time: { fontSize: 11, fontFamily: 'AppleSDGothicNeo-Regular', color: '#7A5C38', marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFAC30', marginTop: 6 },
  emptyContainer: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'AppleSDGothicNeo-Regular', color: '#7A5C38' },
});
