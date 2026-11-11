import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlaceCard } from '@/components/PlaceCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Chip, EmptyState, SearchField } from '@/components/ui';
import { CATEGORY_BY_KEY } from '@/lib/categories';
import { usePlaces } from '@/lib/places';
import { matches } from '@/lib/search';
import type { CategoryKey } from '@/lib/types';
import { space, useTheme } from '@/theme';

export default function CategoryScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const meta = CATEGORY_BY_KEY[key as CategoryKey];
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { places } = usePlaces();
  const [q, setQ] = useState('');
  const [taluk, setTaluk] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);

  const inCategory = useMemo(() => places.filter((p) => p.category === key), [places, key]);
  const taluks = useMemo(() => countBy(inCategory.map((p) => p.taluk)), [inCategory]);
  const subs = useMemo(
    () => countBy(inCategory.filter((p) => !taluk || p.taluk === taluk).map((p) => p.subcategory).filter((s): s is string => !!s)),
    [inCategory, taluk],
  );
  const results = useMemo(
    () => inCategory
      .filter((p) => (!taluk || p.taluk === taluk) && (!sub || p.subcategory === sub) && matches(p, q))
      .sort((a, b) => b.views - a.views || a.name.localeCompare(b.name)),
    [inCategory, taluk, sub, q],
  );

  if (!meta) return <Redirect href="/" />;
  const tint = c[meta.color];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.FlatList
        data={results}
        keyExtractor={(p) => p.id}
        itemLayoutAnimation={LinearTransition.springify().damping(18)}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <ScreenHeader
              title={meta.label}
              subtitle={`${results.length} of ${inCategory.length} listings`}
              colors={[tint, tint + 'b3']}
              icon={<Ionicons name={meta.icon} size={28} color="rgba(255,255,255,0.9)" />}
            >
              <View style={{ marginTop: space.lg }}>
                <SearchField value={q} onChangeText={setQ} placeholder={`Search ${meta.label.toLowerCase()}…`} />
              </View>
            </ScreenHeader>
            <View style={styles.filters}>
              <ChipRow>
                <Chip label="All areas" active={!taluk} onPress={() => { setTaluk(null); setSub(null); }} color={meta.color} count={inCategory.length} />
                {taluks.map(([t, n]) => (
                  <Chip key={t} label={t} active={taluk === t} onPress={() => { setTaluk(t); setSub(null); }} color={meta.color} count={n} />
                ))}
              </ChipRow>
              {meta.subLabel && subs.length > 1 && (
                <ChipRow>
                  <Chip label={meta.subAll} active={!sub} onPress={() => setSub(null)} color={meta.color} />
                  {subs.map(([s, n]) => (
                    <Chip key={s} label={s} active={sub === s} onPress={() => setSub(s)} color={meta.color} count={n} />
                  ))}
                </ChipRow>
              )}
            </View>
          </>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 40).duration(350)} style={styles.item}>
            <PlaceCard place={item} />
          </Animated.View>
        )}
        ListEmptyComponent={<EmptyState icon="search" title="Nothing found" body="Try a different area, filter or search word." />}
      />
    </View>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {children}
    </ScrollView>
  );
}

function countBy(values: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

const styles = StyleSheet.create({
  filters: { paddingTop: space.lg, gap: space.sm, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  chipRow: { gap: space.sm, paddingHorizontal: space.lg },
  item: { paddingHorizontal: space.lg, marginTop: space.md, width: '100%', maxWidth: 1100, alignSelf: 'center' },
});
