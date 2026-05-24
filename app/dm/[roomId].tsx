import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  UserProfile,
  getUserProfile,
  leaveChatRoom,
  markRoomAsRead,
  Message,
  sendMessage,
  subscribeToMessages,
} from '../../src/api/chat';
import { db } from '../../src/firebaseConfig';
import { useAuthStore } from '../../src/store/authStore';

const PANEL_W = 288;

export default function DMRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(PANEL_W)).current;

  const firebaseUser = useAuthStore((s) => s.user);
  const kakaoUser = useAuthStore((s) => s.kakaoUser);
  const myUid = firebaseUser?.uid ?? (kakaoUser ? `kakao_${kakaoUser.id}` : '');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [roomTitle, setRoomTitle] = useState<string | null>(null);
  const [gatheringTitle, setGatheringTitle] = useState<string | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // ── 방 정보 로드 ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !myUid) return;
    (async () => {
      const roomSnap = await getDoc(doc(db, 'chats', roomId));
      if (!roomSnap.exists()) return;
      const data = roomSnap.data();
      const roomMembers = data.members as string[];
      setMembers(roomMembers);
      markRoomAsRead(roomId, myUid).catch(() => {});

      if (data.room_type === 'gathering') {
        setRoomTitle('모임 채팅');
        // 모임 제목 & 호스트 가져오기
        const gSnap = await getDoc(doc(db, 'gatherings', roomId));
        if (gSnap.exists()) {
          const gData = gSnap.data();
          setGatheringTitle(gData.title ?? null);
          setHostId(gData.host_id ?? null);
        }
      } else {
        const otherUid = roomMembers.find((uid) => uid !== myUid);
        if (otherUid) {
          const profile = await getUserProfile(otherUid);
          setOtherUser(profile);
        }
      }
    })();
  }, [roomId, myUid]);

  // ── 메시지 구독 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !myUid) return;
    return subscribeToMessages(roomId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
      markRoomAsRead(roomId, myUid).catch(() => {});
    });
  }, [roomId, myUid]);

  // ── 메뉴 열기 ───────────────────────────────────────────────────────────────
  const openMenu = async () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start();

    if (members.length > 0 && memberProfiles.length === 0) {
      setLoadingProfiles(true);
      const profiles = await Promise.all(members.map((uid) => getUserProfile(uid)));
      setMemberProfiles(profiles.filter(Boolean) as UserProfile[]);
      setLoadingProfiles(false);
    }
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: PANEL_W,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  };

  // ── 채팅방 나가기 ────────────────────────────────────────────────────────────
  const handleLeave = () => {
    Alert.alert('채팅방 나가기', '채팅방을 나가면 메시지를 볼 수 없어요. 나갈까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: async () => {
          if (!roomId || !myUid) return;
          await leaveChatRoom(roomId, myUid).catch(() => {});
          router.back();
        },
      },
    ]);
  };

  // ── 메시지 전송 ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || !roomId || !myUid) return;
    const text = input;
    setInput('');
    await sendMessage(roomId, myUid, text, members);
  };

  const formatTime = (ts: Message['timestamp']) => {
    if (!ts) return '';
    const d = new Date(ts.seconds * 1000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const displayTitle = gatheringTitle ?? roomTitle ?? otherUser?.nickname ?? '채팅';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* ── 헤더 ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color="#1A1108" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerTitleBtn}
          disabled={!otherUser}
          onPress={() => otherUser && router.push({ pathname: '/user/[uid]', params: { uid: otherUser.uid } })}
        >
          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayTitle}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={openMenu}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="menu" size={24} color="#1A1108" />
        </TouchableOpacity>
      </View>

      {/* ── 메시지 목록 ── */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          if (item.sender_id === 'system') {
            return (
              <View style={styles.systemMsgWrap}>
                <Text style={styles.systemMsg}>{item.text}</Text>
              </View>
            );
          }

          if (item.type === 'map_share' && item.shared_uid) {
            const isMe = item.sender_id === myUid;
            return (
              <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
                <View style={styles.mapShareCard}>
                  <View style={styles.mapShareHeader}>
                    <Ionicons name="map" size={18} color="#FFAC30" style={{ marginRight: 6 }} />
                    <Text style={styles.mapShareTitle}>My Own 지도 공유</Text>
                  </View>
                  <Text style={styles.mapShareSub}>
                    {item.sharer_nickname ?? '상대방'}님의 저장 장소
                    {item.pin_count != null ? ` ${item.pin_count}곳` : ''}
                  </Text>
                  <TouchableOpacity
                    style={styles.mapShareBtn}
                    onPress={() => router.push(`/shared-map/${item.shared_uid}` as any)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.mapShareBtnText}>지도 보기</Text>
                    <Ionicons name="arrow-forward" size={14} color="#1A1108" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
              </View>
            );
          }

          const isMe = item.sender_id === myUid;
          return (
            <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                <Text style={styles.bubbleText}>{item.text}</Text>
              </View>
              <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
            </View>
          );
        }}
      />

      {/* ── 입력바 ── */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="메시지를 입력하세요"
          placeholderTextColor="#9A9A9A"
          multiline
          maxLength={500}
          blurOnSubmit={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim()}
        >
          <Ionicons name="send" size={20} color={input.trim() ? '#1A1108' : '#CCCCCC'} />
        </TouchableOpacity>
      </View>

      {/* ── 우측 슬라이드 메뉴 ── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
        statusBarTranslucent
      >
        <View style={menu.modalWrap}>
          {/* 어두운 배경 — 누르면 닫힘 */}
          <TouchableOpacity style={menu.overlay} activeOpacity={1} onPress={closeMenu} />

          {/* 슬라이드 패널 */}
          <Animated.View
            style={[
              menu.panel,
              { paddingTop: insets.top, paddingBottom: insets.bottom + 16, transform: [{ translateX: slideAnim }] },
            ]}
          >
            {/* 패널 헤더 */}
            <View style={menu.panelHeader}>
              <TouchableOpacity onPress={closeMenu} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="#1A1108" />
              </TouchableOpacity>
            </View>

            {/* 채팅방 이름 */}
            <View style={menu.titleSection}>
              <View style={menu.roomIcon}>
                <Ionicons name="chatbubbles" size={22} color="#FFAC30" />
              </View>
              <Text style={menu.roomName} numberOfLines={2}>
                {gatheringTitle ?? roomTitle ?? '채팅방'}
              </Text>
              <Text style={menu.memberCount}>{members.length}명 참여 중</Text>
            </View>

            <View style={menu.divider} />

            {/* 참여 멤버 목록 */}
            <Text style={menu.sectionLabel}>참여 멤버</Text>

            <ScrollView style={menu.memberList} showsVerticalScrollIndicator={false}>
              {loadingProfiles ? (
                <Text style={menu.loadingText}>불러오는 중…</Text>
              ) : (
                memberProfiles.map((p) => (
                  <TouchableOpacity
                    key={p.uid}
                    style={menu.memberRow}
                    onPress={() => {
                      closeMenu();
                      setTimeout(() => {
                        router.push({ pathname: '/user/[uid]', params: { uid: p.uid } });
                      }, 260);
                    }}
                  >
                    <View style={menu.memberAvatar}>
                      <Ionicons name="person" size={18} color="#1A1108" />
                    </View>
                    <View style={menu.memberInfo}>
                      <Text style={menu.memberName}>{p.nickname}</Text>
                      {p.uid === hostId && (
                        <Text style={menu.hostLabel}>모임장</Text>
                      )}
                    </View>
                    {p.uid === myUid && (
                      <Text style={menu.meLabel}>나</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* 나가기 버튼 */}
            <TouchableOpacity style={menu.leaveBtn} onPress={() => { closeMenu(); setTimeout(handleLeave, 260); }}>
              <Ionicons name="exit-outline" size={18} color="#E05252" />
              <Text style={menu.leaveBtnText}>채팅방 나가기</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── 메인 스타일 ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D4',
    backgroundColor: '#FFFFFF',
  },
  headerTitleBtn: { flex: 1 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    marginHorizontal: 8,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  msgRow: {
    marginBottom: 2,
  },
  msgRowMe: { alignItems: 'flex-end' },
  msgRowOther: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: '#FFAC30',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#F5F5F5',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  bubbleText: {
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    lineHeight: 22,
  },
  timeText: {
    fontSize: 11,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9A9A9A',
    marginTop: 3,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#D4D4D4',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#1A1108',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFAC30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  mapShareCard: {
    maxWidth: '75%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFAC30',
    padding: 14,
    gap: 6,
  },
  mapShareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapShareTitle: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
  },
  mapShareSub: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9A9A9A',
  },
  mapShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF0D4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  mapShareBtnText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
  },
  systemMsgWrap: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMsg: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9A9A9A',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    textAlign: 'center',
  },
});

// ── 슬라이드 메뉴 스타일 ──────────────────────────────────────────────────────

const menu = StyleSheet.create({
  modalWrap: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  panel: {
    width: PANEL_W,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#D4D4D4',
    shadowColor: '#1A1108',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'flex-start',
    gap: 8,
  },
  roomIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF0D4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFAC30',
    marginBottom: 4,
  },
  roomName: {
    fontSize: 16,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    lineHeight: 22,
  },
  memberCount: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9A9A9A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 0,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#8A6030',
    letterSpacing: 0.4,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  memberList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#9A9A9A',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 10,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D4D4D4',
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-SemiBold',
    color: '#1A1108',
  },
  hostLabel: {
    fontSize: 11,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#FFAC30',
  },
  meLabel: {
    fontSize: 11,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#9A9A9A',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  leaveBtnText: {
    fontSize: 13,
    fontFamily: 'AppleSDGothicNeo-Medium',
    color: '#E05252',
  },
});
