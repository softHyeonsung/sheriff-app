import { StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>프로필 준비 중...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF7', justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  text: { fontSize: 16, fontFamily: 'AppleSDGothicNeo-Regular', color: '#7A5C38' },
});