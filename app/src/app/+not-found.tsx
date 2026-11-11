import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { PressableScale } from '@/components/ui';
import { useTheme } from '@/theme';

export default function NotFound() {
  const { c } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <Text style={[styles.title, { color: c.ink }]}>Page not found</Text>
      <PressableScale onPress={() => router.replace('/')} style={[styles.btn, { backgroundColor: c.ink }]}>
        <Text style={{ color: c.bg, fontWeight: '800' }}>Go home</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { fontSize: 22, fontWeight: '800' },
  btn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999 },
});
