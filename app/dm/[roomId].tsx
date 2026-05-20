import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserProfile, Message, sendMessage, subscribeToMessages, UserProfile } from '../../src/api/chat';
import { db } from '../../src/firebaseConfig';
import { useAuthStore } from '../../src/store/authStore';

export default function DMRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatRef = useRef<FlatList>(null);

  const firebaseUser = useAuthStore((s) => s.user);
  const kakaoUser = useAuthStore((s) => s.kakaoUser);
  const myUid = firebaseUser?.uid ?? (kakaoUser ? `kakao_${kakaoUser.id}` : '');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [roomTitle, setRoomTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId || !myUid) return;
    (async () => {
      const roomSnap = await getDoc(doc(db, 'chats', roomId));
      if (!roomSnap.exists()) return;
      const data = roomSnap.data();
      if (data.room_type === 'gathering') {
        setRoomTitle('모임 채팅');
      } else {
        const otherUid = (data.members as string[]).find((uid) => uid !== myUid);
        if (otherUid) {
          const profile = await getUserProfile(otherUid);
          setOtherUser(profile);
        }
      }
    })();
  }, [roomId, myUid]);

  useEffect(() => {
    if (!roomId) return;
    return subscribeToMessages(roomId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
    });
  }, [roomId]);

  const handleSend = async () => {
    if (!input.trim() || !roomId || !myUid) return;
    const text = input;
    setInput('');
    await sendMessage(roomId, myUid, text);
  };

  const formatTime = (ts: Message['timestamp']) => {
    if (!ts) return '';
    const d = new Date(ts.seconds * 1000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color="#1A1108" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {roomTitle ?? otherUser?.nickname ?? '채팅'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
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
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim()}
        >
          <Ionicons name="send" size={20} color={input.trim() ? '#1A1108' : '#CCCCCC'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D4',
    backgroundColor: '#FFFFFF',
  },
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
});
