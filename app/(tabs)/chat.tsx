// 경로: app/(tabs)/chat.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 96 }]}>
      <View style={styles.emptyState}>
        <View style={styles.iconWrap}>
          <Ionicons name="send" size={40} color="#FFAC30" />
        </View>
        <Text style={styles.title}>채팅방이 없어요</Text>
        <Text style={styles.sub}>모임이나 퀘스트에 참여하면{'\n'}자동으로 채팅방이 생겨요</Text>
        <TouchableOpacity style={styles.cta} accessibilityRole="button" accessibilityLabel="모임 찾아보기">
          <Text style={styles.ctaText}>모임 찾아보기</Text>
        </TouchableOpacity>
      </View>

      {/* Info strip at bottom */}
      <View style={styles.infoStrip}>
        <Ionicons name="information-circle" size={16} color="#A36E1D" />
        <Text style={styles.infoText}>채팅은 모임 참여 승인 후 개설돼요</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyState: {
    alignItems: 'center',
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#A36E1D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontFamily: 'AppleSDGothicNeo-Bold',
    color: '#1A1108',
    marginBottom: 10,
  },
  sub: {
    fontSize: 14,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#7A5C38',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  cta: {
    backgroundColor: '#FFAC30',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#A36E1D',
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
  infoStrip: {
    position: 'absolute',
    bottom: 96 + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'AppleSDGothicNeo-Regular',
    color: '#A36E1D',
  },
});
