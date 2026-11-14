import { useMemo } from 'react';
import { FlatList, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInRight,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeAdCard } from '@/components/Ads';
import { FeaturedCard } from '@/components/PlaceCard';
import { Seo } from '@/components/Seo';
import { HOME_SEO } from '@/lib/seo';
import { PressableScale, SectionTitle } from '@/components/ui';
import { CATEGORIES } from '@/lib/categories';
import { usePlaces } from '@/lib/places';
import { radius, shadow, space, useInBrowser, useTheme } from '@/theme';

const MAX_WIDTH = 1100;

export default function Home() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  // Pre-rendered HTML has no window size; use it only after hydration so the first render matches.
  const windowWidth = useWindowDimensions().width;
  const width = useInBrowser() ? windowWidth : 0;
  const { places, popular, offline } = usePlaces();
  const scrollY = useSharedValue(0);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of places) m[p.category] = (m[p.category] ?? 0) + 1;
    return m;
  }, [places]);
  const areas = useMemo(() => new Set(places.map((p) => p.taluk)).size, [places]);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  // Hero drifts up slower than the page and fades as you scroll.
  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [-200, 0, 300], [-60, 0, 120], Extrapolation.CLAMP) }],
    opacity: interpolate(scrollY.value, [0, 260], [1, 0.2], Extrapolation.CLAMP),
  }));

  const contentWidth = Math.min(width, MAX_WIDTH);
  const columns = contentWidth >= 900 ? 8 : 4;
  const tileSize = (contentWidth - space.lg * 2 - space.md * (columns - 1)) / columns;

  return (
    <Animated.ScrollView
      onScroll={onScroll}
      scrollEventThrottle={16}
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
    >
      <Seo {...HOME_SEO} />
      {/* Hero */}
      <Animated.View style={heroStyle}>
        <View style={[styles.hero, { paddingTop: insets.top + space.xl, backgroundColor: c.heroFrom }]}>
          {/* Hogenakkal Falls — Photo: Ashwin Kumar, CC BY-SA 2.0 (credited below) */}
          <ExpoImage
            source={require('../../assets/images/hero-hogenakkal.jpg')}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition="center"
            transition={300}
            accessibilityLabel="Coracles on the Kaveri at Hogenakkal"
          />
          <LinearGradient
            colors={['rgba(8,26,19,0.70)', 'rgba(8,26,19,0.30)', 'rgba(8,26,19,0.88)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.inner, { maxWidth: MAX_WIDTH }]}>
            <Animated.View entering={FadeInDown.duration(500)} style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Image source={require('../../assets/logo-mark.png')} style={styles.brandLogo} accessibilityLabel="MyDharmapuri logo" />
              </View>
              <Text style={styles.brandName}>MyDharmapuri</Text>
              <View style={{ flex: 1 }} />
              <PressableScale onPress={() => router.push('/submit')} style={styles.addBtn} accessibilityLabel="Add a place">
                <Ionicons name="add" size={16} color="#122a20" />
                <Text style={styles.addBtnText}>Add a place</Text>
              </PressableScale>
            </Animated.View>
            <Animated.Text entering={FadeInDown.delay(80).duration(600)} style={styles.heroKicker}>
              DISTRICT DIRECTORY · TAMIL NADU
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(140).duration(600)} style={styles.heroTitle}>
              Discover{'\n'}Dharmapuri
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(200).duration(600)} style={styles.heroSub}>
              {places.length} verified listings · {areas} areas
            </Animated.Text>
            <Animated.View entering={FadeInDown.delay(260).duration(600)}>
              <PressableScale href="/search" scaleTo={0.98} style={[styles.heroSearch, shadow(c, 2)]}>
                <Ionicons name="search" size={18} color="#5f7268" />
                <Text style={styles.heroSearchText}>Search restaurants, hospitals, places…</Text>
              </PressableScale>
            </Animated.View>
          </View>
          <Text style={styles.heroCredit}>Hogenakkal · Photo: Ashwin Kumar, CC BY-SA 2.0</Text>
        </View>
      </Animated.View>

      <View style={[styles.inner, styles.sheet, { backgroundColor: c.bg, maxWidth: MAX_WIDTH }]}>
        {offline && (
          <View style={[styles.notice, { backgroundColor: c.gold + '22', borderColor: c.gold + '55' }]}>
            <Ionicons name="cloud-offline-outline" size={16} color={c.gold} />
            <Text style={[styles.noticeText, { color: c.ink }]}>Showing saved data — live updates are off.</Text>
          </View>
        )}

        {/* Categories */}
        <View style={styles.grid}>
          {CATEGORIES.map((cat, i) => {
            const tint = c[cat.color];
            return (
              <Animated.View key={cat.key} entering={FadeInDown.delay(80 + i * 45).springify().damping(16)}>
                <PressableScale
                  href={`/category/${cat.key}`}
                  accessibilityLabel={cat.label}
                  style={[styles.tile, { width: tileSize }]}
                >
                  <LinearGradient colors={[tint, tint + 'b3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tileIcon, shadow(c)]}>
                    <Ionicons name={cat.icon} size={24} color="#fff" />
                  </LinearGradient>
                  <Text style={[styles.tileLabel, { color: c.ink }]} numberOfLines={1}>{cat.short}</Text>
                  <Text style={[styles.tileCount, { color: c.muted }]}>{counts[cat.key] ?? 0}</Text>
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>

        {/* Frequently looked up */}
        {popular.length > 0 && (
          <View style={styles.section}>
            <SectionTitle title="Frequently looked up" />
            <FlatList
              horizontal
              data={popular}
              keyExtractor={(p) => p.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: space.md, paddingRight: space.lg, paddingVertical: 6 }}
              style={{ marginHorizontal: -space.lg, paddingLeft: space.lg }}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInRight.delay(120 + index * 70).springify().damping(18)}>
                  <FeaturedCard place={item} />
                </Animated.View>
              )}
            />
          </View>
        )}

        <NativeAdCard style={{ marginTop: space.xl }} />

        {/* Urban services teaser */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.section}>
          <PressableScale href="/urban-services" scaleTo={0.98}>
            <LinearGradient colors={[c.teal, c.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.promo, shadow(c, 2)]}>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.soonPill}><Text style={styles.soonPillText}>COMING SOON</Text></View>
                <Text style={styles.promoTitle}>Urban Services</Text>
                <Text style={styles.promoBody}>Home, auto, beauty, repairs and 14 more service categories — launching soon.</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={36} color="#fff" />
            </LinearGradient>
          </PressableScale>
        </Animated.View>

        {/* Add a place */}
        <Animated.View entering={FadeInDown.delay(360).duration(500)} style={styles.section}>
          <View style={[styles.cta, { backgroundColor: c.card, borderColor: c.line }, shadow(c)]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.ctaTitle, { color: c.ink }]}>Know a place we're missing?</Text>
              <Text style={[styles.ctaBody, { color: c.muted }]}>Add it — our team reviews every submission before it goes live.</Text>
            </View>
            <PressableScale onPress={() => router.push('/submit')} style={[styles.ctaBtn, { backgroundColor: c.ink }]}>
              <Text style={[styles.ctaBtnText, { color: c.bg }]}>Add a place</Text>
            </PressableScale>
          </View>
        </Animated.View>

        <Text style={[styles.footer, { color: c.muted }]}>
          Independently compiled from public sources — please verify before relying on it.
        </Text>
      </View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: space.lg, paddingBottom: 84, overflow: 'hidden' },
  heroCredit: {
    position: 'absolute', right: space.lg, bottom: 44,
    color: 'rgba(255,255,255,0.6)', fontSize: 10,
  },
  inner: { width: '100%', alignSelf: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 36 },
  brandMark: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  brandLogo: { width: 40, height: 40 },
  brandName: { color: '#fff', fontWeight: '800', letterSpacing: 0.6, fontSize: 15 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff',
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
  },
  addBtnText: { color: '#122a20', fontWeight: '800', fontSize: 13 },
  heroKicker: { color: 'rgba(255,255,255,0.75)', fontWeight: '800', fontSize: 11.5, letterSpacing: 1.6 },
  heroTitle: { color: '#fff', fontSize: 44, lineHeight: 48, fontWeight: '900', letterSpacing: -1.2, marginTop: 10 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, marginTop: 10, marginBottom: 22 },
  heroSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff',
    height: 54, borderRadius: radius.lg, paddingHorizontal: space.lg,
  },
  heroSearchText: { color: '#5f7268', fontSize: 15, flexShrink: 1 },
  sheet: {
    marginTop: -36, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: space.lg, paddingTop: space.xl,
  },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1,
    borderRadius: radius.md, padding: space.md, marginBottom: space.lg,
  },
  noticeText: { fontSize: 13, flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, rowGap: space.lg },
  tile: { alignItems: 'center', gap: 6 },
  tileIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 13, fontWeight: '700' },
  tileCount: { fontSize: 11, fontWeight: '600', marginTop: -4 },
  section: { marginTop: space.xxl },
  promo: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.xl, borderRadius: radius.xl },
  soonPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  soonPillText: { color: '#fff', fontSize: 10.5, fontWeight: '800', letterSpacing: 1 },
  promoTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  promoBody: { color: 'rgba(255,255,255,0.9)', fontSize: 13.5, lineHeight: 19 },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: space.lg, flexWrap: 'wrap',
    padding: space.xl, borderRadius: radius.xl, borderWidth: 1,
  },
  ctaTitle: { fontSize: 17, fontWeight: '800' },
  ctaBody: { fontSize: 13.5, lineHeight: 19 },
  ctaBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999 },
  ctaBtnText: { fontWeight: '800', fontSize: 14 },
  footer: { textAlign: 'center', fontSize: 12, marginTop: space.xxl },
});
