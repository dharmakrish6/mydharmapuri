import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlaceCard } from '@/components/PlaceCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState, SearchField } from '@/components/ui';
import { CATEGORIES } from '@/lib/categories';
import { usePlaces } from '@/lib/places';
import { matches } from '@/lib/search';
import { space, useTheme } from '@/theme';

const ORDER = Object.fromEntries(CATEGORIES.map((c, i) => [c.key, i]));

export default function SearchScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { places } = usePlaces();
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    if (q.trim().length < 2) return [];
    return places
      .filter((p) => matches(p, q))
      .sort((a, b) => ORDER[a.category] - ORDER[b.category] || b.views - a.views)
      .slice(0, 80);
  }, [places, q]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.FlatList
        data={results}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        itemLayoutAnimation={LinearTransition.springify().damping(18)}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        ListHeaderComponent={
          <ScreenHeader title="Search" subtitle="Across all categories" colors={[c.heroFrom, c.heroTo]}>
            <View style={{ marginTop: space.lg }}>
              <SearchField value={q} onChangeText={setQ} placeholder="Try “biryani”, “eye hospital”, “Harur”…" autoFocus />
            </View>
          </ScreenHeader>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 35).duration(300)} style={styles.item}>
            <PlaceCard place={item} />
          </Animated.View>
        )}
        ListEmptyComponent={
          q.trim().length < 2
            ? <Text style={[styles.hint, { color: c.muted }]}>Type at least 2 letters to search {places.length} listings.</Text>
            : <EmptyState icon="search" title="No matches" body="Check the spelling or try a shorter word." />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  item: { paddingHorizontal: space.lg, marginTop: space.md, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  hint: { textAlign: 'center', marginTop: space.xxl, fontSize: 14, paddingHorizontal: space.xl },
});
