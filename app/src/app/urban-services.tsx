import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlaceCard } from '@/components/PlaceCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Seo } from '@/components/Seo';
import { PressableScale } from '@/components/ui';
import { SERVICE_TYPES } from '@/lib/categories';
import { placeArtIcon } from '@/lib/placeIcons';
import { usePlaces } from '@/lib/places';
import { urbanSeo } from '@/lib/seo';
import { radius, shadow, space, useTheme } from '@/theme';

/** Planned service types that don't have a section yet. */
const COMING = [
  ['🏠', 'Home services'],
  ['🔌', 'Electricians'],
  ['🚰', 'Plumbers'],
  ['❄️', 'AC & appliance repair'],
  ['💻', 'Computer & mobile repair'],
  ['🚗', 'Car mechanics'],
  ['💇', 'Beauty & salon'],
  ['🧹', 'Cleaning & pest control'],
  ['🎉', 'Events & wedding'],
  ['🚚', 'Packers & movers'],
] as const;

/** Urban Services: local service providers grouped by service type, plus what's coming next. */
export default function UrbanServices() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { places } = usePlaces();

  const services = useMemo(
    () => places.filter((p) => p.category === 'services').sort((a, b) => b.views - a.views || a.name.localeCompare(b.name)),
    [places],
  );
  // Known types first (fixed order), then any other type an admin has used.
  const groups = useMemo(() => {
    const types = [...SERVICE_TYPES, ...new Set(services.map((p) => p.subcategory ?? 'Other'))].filter((t, i, all) => all.indexOf(t) === i);
    return types.map((type) => ({ type, items: services.filter((p) => (p.subcategory ?? 'Other') === type) }));
  }, [services]);

  return (
    <Animated.ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
      <Seo {...urbanSeo(services)} />
      <ScreenHeader
        title="Urban Services"
        subtitle={services.length ? `${services.length} trusted service providers across Dharmapuri` : "Dharmapuri's local services, in one place"}
        colors={[c.teal, c.violet]}
        icon={<Ionicons name="construct" size={26} color="rgba(255,255,255,0.9)" />}
      />

      <View style={styles.inner}>
        {/* Service type tiles */}
        <View style={styles.tiles}>
          {groups.map(({ type, items }, i) => (
            <Animated.View key={type} entering={FadeInDown.delay(60 + i * 50).springify().damping(16)} style={styles.tileWrap}>
              <View style={[styles.tile, { backgroundColor: c.card, borderColor: c.line }, shadow(c)]}>
                <View style={[styles.tileIcon, { backgroundColor: c.teal }]}>
                  <MaterialIcons name={placeArtIcon({ category: 'services', subcategory: type, name: type })} size={26} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tileLabel, { color: c.ink }]}>{type}</Text>
                  <Text style={[styles.tileCount, { color: c.muted }]}>
                    {items.length ? `${items.length} listing${items.length === 1 ? '' : 's'}` : 'Listings coming soon'}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Providers per service type */}
        {groups.map(({ type, items }) => (
          <View key={type} style={styles.group}>
            <Text style={[styles.groupTitle, { color: c.ink }]}>{type}s in Dharmapuri</Text>
            {items.length ? (
              <View style={{ gap: space.md }}>
                {items.map((p) => <PlaceCard key={p.id} place={p} />)}
              </View>
            ) : (
              <PressableScale onPress={() => router.push('/submit')} scaleTo={0.98} style={[styles.empty, { borderColor: c.line }]}>
                <Ionicons name="add-circle-outline" size={18} color={c.teal} />
                <Text style={{ color: c.muted, flex: 1 }}>No {type} listings yet. Know a good one? Add it.</Text>
              </PressableScale>
            )}
          </View>
        ))}

        {/* What's next */}
        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: c.ink }]}>Coming soon</Text>
          <View style={styles.coming}>
            {COMING.map(([emoji, label]) => (
              <View key={label} style={[styles.comingChip, { backgroundColor: c.card, borderColor: c.line }]}>
                <Text>{emoji}</Text>
                <Text style={[styles.comingText, { color: c.muted }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  inner: { width: '100%', maxWidth: 1100, alignSelf: 'center', paddingHorizontal: space.lg, paddingTop: space.xl },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tileWrap: { flexGrow: 1, flexBasis: 260 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
  tileIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 15.5, fontWeight: '800' },
  tileCount: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  group: { marginTop: space.xl },
  groupTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: space.md },
  empty: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md,
    borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed',
  },
  coming: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  comingChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  comingText: { fontSize: 13, fontWeight: '600' },
});
