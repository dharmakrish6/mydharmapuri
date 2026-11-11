import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { radius, shadow, space, useTheme } from '@/theme';

const SERVICES = [
  ['🏠', 'Home Services'],
  ['🚗', 'Auto Services'],
  ['💇', 'Beauty & Personal Care'],
  ['🏥', 'Health & Medical'],
  ['👨‍💼', 'Professional Services'],
  ['🏡', 'Real Estate & Construction'],
  ['🍴', 'Food & Restaurants'],
  ['🎉', 'Events & Wedding'],
  ['📚', 'Education & Training'],
  ['🛍️', 'Shopping & Retail'],
  ['💻', 'Computer & Mobile'],
  ['🚚', 'Transport & Logistics'],
  ['🔧', 'Repair & Maintenance'],
  ['💰', 'Finance & Legal'],
  ['🐕', 'Pet & Veterinary'],
  ['🧹', 'Cleaning & Pest Control'],
  ['🏋️', 'Fitness & Sports'],
  ['📦', 'Rental Services'],
] as const;

export default function UrbanServices() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 3 : 2;
  const inner = Math.min(width, 900) - space.lg * 2;
  const tileW = (inner - space.md * (cols - 1)) / cols;

  return (
    <Animated.ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
      <ScreenHeader title="Urban Services" subtitle="We're bringing Dharmapuri's services together in one place." colors={[c.teal, c.violet]}>
        <Animated.View entering={ZoomIn.delay(200).springify()} style={styles.soon}>
          <Text style={styles.soonText}>COMING SOON</Text>
        </Animated.View>
      </ScreenHeader>
      <View style={styles.inner}>
        <Text style={[styles.heading, { color: c.ink }]}>What's coming</Text>
        <Text style={[styles.sub, { color: c.muted }]}>Service categories we're planning to launch</Text>
        <View style={styles.grid}>
          {SERVICES.map(([emoji, label], i) => (
            <Animated.View
              key={label}
              entering={FadeInDown.delay(80 + i * 40).springify().damping(16)}
              style={[styles.tile, { width: tileW, backgroundColor: c.card, borderColor: c.line }, shadow(c)]}
            >
              <View style={[styles.emoji, { backgroundColor: c.teal + '1f' }]}>
                <Text style={{ fontSize: 22 }}>{emoji}</Text>
              </View>
              <Text style={[styles.label, { color: c.ink }]}>{label}</Text>
            </Animated.View>
          ))}
        </View>
      </View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  soon: { alignSelf: 'flex-start', marginTop: space.lg, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  soonText: { color: '#fff', fontWeight: '800', fontSize: 11, letterSpacing: 1.2 },
  inner: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: space.lg, paddingTop: space.xl },
  heading: { fontSize: 20, fontWeight: '800' },
  sub: { fontSize: 14, marginTop: 4, marginBottom: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
  emoji: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
});
