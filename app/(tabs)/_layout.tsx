import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';

/**
 * 하단 탭에 사용할 아이콘 컴포넌트
 */
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2f95dc', // 활성화된 탭 색상 (보안관 브랜드 색으로 추후 변경)
        headerShown: true,             // 상단 타이틀 표시 여부
      }}>
      
      {/* 1. 지도 (홈) */}
      <Tabs.Screen
        name="index"
        options={{
          title: '지도',
          tabBarIcon: ({ color }) => <TabBarIcon name="map" color={color} />,
        }}
      />

      {/* 2. 피드 */}
      <Tabs.Screen
        name="feed"
        options={{
          title: '피드',
          tabBarIcon: ({ color }) => <TabBarIcon name="th-list" color={color} />,
        }}
      />

      {/* 3. 채팅 */}
      <Tabs.Screen
        name="chat"
        options={{
          title: '채팅',
          tabBarIcon: ({ color }) => <TabBarIcon name="comments" color={color} />,
        }}
      />

      {/* 4. 모임 (Gathering/Quest 통합 또는 구분) */}
      <Tabs.Screen
        name="community"
        options={{
          title: '모임',
          tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
        }}
      />

      {/* 5. 프로필 */}
      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}