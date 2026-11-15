import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlaceCard } from '@/components/PlaceCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Seo } from '@/components/Seo';
import { PressableScale } from '@/components/ui';
import { CATEGORIES, TALUKS, TALUK_BY_SLUG, areaSlug } from '@/lib/categories';
import { usePlaces } from '@/lib/places';
import { areaSeo } from '@/lib/seo';
import { radius, space, useTheme } from '@/theme';

/** Pre-render one page per area (web static export). */
export function generateStaticParams() {
  return TALUKS.map((t) => ({ slug: areaSlug(t) }));
}

/** Everything in one taluk, grouped by category, every listing a link. */
export default function AreaScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const taluk = TALUK_BY_SLUG[slug ?? ''];
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { places } = usePlaces();

  const inArea = useMemo(
    () => places.filter((p) => p.taluk === taluk).sort((a, b) => b.views - a.views || a.name.localeCompare(b.name)),
    [places, taluk],
  );
  const groups = useMemo(
    () => CATEGORIES.map((cat) => ({ cat, items: inArea.filter((p) => p.category === cat.key) })).filter((g) => g.items.length),
    [inArea],
  );

  if (!taluk) return <Redirect href="/" />;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Seo {...areaSeo(taluk, inArea)} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <ScreenHeader
          title={taluk}
          subtitle={`${inArea.length} listings in ${taluk} taluk, Dharmapuri district`}
          colors={[c.heroFrom, c.heroTo]}
          icon={<Ionicons name="location" size={26} color="rgba(255,255,255,0.9)" />}
        />

        {/* Jump links to each category on this page */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.jumpRow} style={styles.inner}>
          {groups.map(({ cat, items }) => (
            <View key={cat.key} style={[styles.jump, { backgroundColor: c.card, borderColor: c.line }]}>
              <Ionicons name={cat.icon} size={14} color={c[cat.color]} />
              <Text style={[styles.jumpText, { color: c.ink }]}>{cat.short}</Text>
              <Text style={[styles.jumpCount, { color: c.muted }]}>{items.length}</Text>
            </View>
          ))}
        </ScrollView>

        {groups.map(({ cat, items }) => (
          <View key={cat.key} style={[styles.inner, styles.group]}>
            <View style={styles.groupHead}>
              <Text style={[styles.groupTitle, { color: c.ink }]}>{cat.label} in {taluk}</Text>
              <PressableScale href={`/category/${cat.key}`} scaleTo={0.97}>
                <Text style={[styles.all, { color: c[cat.color] }]}>All {cat.label.toLowerCase()} →</Text>
              </PressableScale>
            </View>
            <View style={{ gap: space.md }}>
              {items.map((p) => <PlaceCard key={p.id} place={p} />)}
            </View>
          </View>
        ))}

        {/* Other areas — internal links for visitors and search engines */}
        <View style={[styles.inner, styles.group]}>
          <Text style={[styles.groupTitle, { color: c.ink }]}>Other areas</Text>
          <View style={styles.areaWrap}>
            {TALUKS.filter((t) => t !== taluk).map((t) => (
              <PressableScale key={t} href={`/area/${areaSlug(t)}`} scaleTo={0.96} style={[styles.jump, { backgroundColor: c.card, borderColor: c.line }]}>
                <Ionicons name="location-outline" size={14} color={c.leaf} />
                <Text style={[styles.jumpText, { color: c.ink }]}>{t}</Text>
              </PressableScale>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { width: '100%', maxWidth: 1100, alignSelf: 'center', paddingHorizontal: space.lg },
  jumpRow: { gap: space.sm, paddingTop: space.lg },
  jump: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radius.lg,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  jumpText: { fontWeight: '700', fontSize: 13 },
  jumpCount: { fontSize: 12, fontWeight: '600' },
  group: { marginTop: space.xl },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md, gap: space.md },
  groupTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, flexShrink: 1 },
  all: { fontSize: 13, fontWeight: '700' },
  areaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
});
