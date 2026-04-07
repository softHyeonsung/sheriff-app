// 경로: app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Icon map ───────────────────────────────────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { focused: IoniconName; unfocused: IoniconName }> = {
  index:     { focused: 'map',    unfocused: 'map-outline' },
  feed:      { focused: 'chatbox', unfocused: 'chatbox-outline' },
  community: { focused: 'people', unfocused: 'people-outline' },
  chat:      { focused: 'send',   unfocused: 'send-outline' },
  profile:   { focused: 'person', unfocused: 'person-outline' },
};

// ── Floating tab bar ───────────────────────────────────────────────────────────

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarOuter, { bottom: insets.bottom + 8 }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icons = TAB_ICONS[route.name];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
            >
              <Ionicons
                name={isFocused ? icons?.focused : icons?.unfocused}
                size={24}
                color={isFocused ? '#FFAC30' : '#8A6030'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────────

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#FFFDF7' },
        headerTintColor: '#1A1108',
        headerTitleStyle: { fontFamily: 'AppleSDGothicNeo-Bold', fontSize: 18 },
        headerShadowVisible: false,
      }}
    >
      {/* 1. 지도 — full-bleed, no header */}
      <Tabs.Screen
        name="index"
        options={{ title: '지도', headerShown: false }}
      />

      {/* 2. 피드 */}
      <Tabs.Screen
        name="feed"
        options={{ title: '보안관' }}
      />

      {/* 3. 모임 */}
      <Tabs.Screen
        name="community"
        options={{ title: '모임' }}
      />

      {/* 4. 채팅 */}
      <Tabs.Screen
        name="chat"
        options={{ title: '채팅' }}
      />

      {/* 5. 프로필 */}
      <Tabs.Screen
        name="profile"
        options={{ title: '프로필' }}
      />
    </Tabs>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFDF7',
    borderRadius: 32,
    paddingVertical: 10,
    paddingHorizontal: 8,
    shadowColor: '#A36E1D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
});
