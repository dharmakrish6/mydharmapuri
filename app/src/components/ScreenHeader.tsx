import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, space } from '@/theme';
import { PressableScale } from './ui';

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Gradient page header with a back button, title and optional subtitle. */
export function ScreenHeader({ title, subtitle, colors, icon, children }: {
  title: string;
  subtitle?: string;
  colors: [string, string];
  icon?: ReactNode;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + space.md }]}>
      <View style={styles.inner}>
        <View style={styles.row}>
          <PressableScale onPress={goBack} style={styles.back} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </PressableScale>
          {icon}
        </View>
        <Animated.Text entering={FadeInDown.duration(450)} style={styles.title}>{title}</Animated.Text>
        {subtitle && <Animated.Text entering={FadeInDown.delay(60).duration(450)} style={styles.subtitle}>{subtitle}</Animated.Text>}
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingBottom: space.xl, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  inner: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg },
  back: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 },
});
