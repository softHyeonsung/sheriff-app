// 3-dot 액션 메뉴 바텀시트 공용 스타일 — app/post/[id].tsx, app/user/[uid].tsx에서 공유
import { StyleSheet } from 'react-native';

export const menuStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  sep: { height: 1, backgroundColor: '#F5F5F5' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  itemDanger: { fontSize: 16, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#E05252' },
  itemLabel: { fontSize: 16, fontFamily: 'AppleSDGothicNeo-SemiBold', color: '#1A1108' },
  itemCancel: { fontSize: 16, fontFamily: 'AppleSDGothicNeo-Regular', color: '#7A5C38' },
});
