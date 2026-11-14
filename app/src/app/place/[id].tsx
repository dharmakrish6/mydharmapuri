import { useEffect, type ComponentProps } from 'react';
import { Linking, Platform, Share, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Extrapolation,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '@/components/ScreenHeader';
import { PlaceCard } from '@/components/PlaceCard';
import { AdBanner } from '@/components/Ads';
import { PlaceArt } from '@/components/PlaceArt';
import { Seo } from '@/components/Seo';
import seed from '@/data/places.seed.json';
import { placeSeo } from '@/lib/seo';
import type { Place } from '@/lib/types';
import { Badge, PressableScale } from '@/components/ui';
import { CATEGORY_BY_KEY } from '@/lib/categories';
import { usePlaces } from '@/lib/places';
import { radius, shadow, space, useTheme } from '@/theme';

const HERO = 300;

/** Pre-render a page for every place in the bundled snapshot (web static export). */
export function generateStaticParams() {
  return (seed as Place[]).map((p) => ({ id: p.id }));
}

export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { byId, places, loading, recordView, track } = usePlaces();
  const place = byId(id);
  const scrollY = useSharedValue(0);

  useEffect(() => {
    if (place) recordView(place.id);
  }, [place?.id, recordView]);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-HERO, 0, HERO], [-HERO / 2, 0, HERO * 0.6], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [-HERO, 0], [2, 1], Extrapolation.CLAMP) },
    ],
  }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [HERO - 140, HERO - 60], [0, 1], Extrapolation.CLAMP),
  }));

  if (!place) {
    if (loading) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
    return <Redirect href="/" />;
  }

  const meta = CATEGORY_BY_KEY[place.category];
  const tint = c[meta.color];
  const tel = place.phone?.replace(/[^\d+]/g, '');
  const mapsQuery = encodeURIComponent(`${place.name}, ${place.address ?? place.taluk}, Tamil Nadu`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const nearby = places
    .filter((p) => p.category === place.category && p.taluk === place.taluk && p.id !== place.id)
    .sort((a, b) => b.views - a.views)
    .slice(0, 3);

  const call = () => {
    if (!tel) return;
    track(place.id, 'calls');
    Linking.openURL(`tel:${tel}`);
  };
  const directions = () => {
    track(place.id, 'directions');
    Linking.openURL(mapsUrl);
  };
  const share = async () => {
    track(place.id, 'shares');
    const text = [place.name, place.address, place.phone && `Phone: ${place.phone}`, mapsUrl].filter(Boolean).join('\n');
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: place.name, text }).catch(() => {});
    } else {
      await Share.share({ message: text, title: place.name }).catch(() => {});
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Seo {...placeSeo(place)} />
      {/* Parallax hero */}
      <Animated.View style={[styles.hero, heroStyle]}>
        <LinearGradient colors={[tint, tint + 'aa', c.heroFrom]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {place.image ? (
          <Image source={place.image.url} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        ) : (
          <PlaceArt place={place} variant="hero" />
        )}
        <LinearGradient colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Bar that fades in once the hero scrolls away */}
      <Animated.View style={[styles.bar, { paddingTop: insets.top, height: insets.top + 56, backgroundColor: tint }, barStyle]}>
        <Text style={styles.barTitle} numberOfLines={1}>{place.name}</Text>
      </Animated.View>
      <View style={[styles.topButtons, { top: insets.top + 8 }]}>
        <PressableScale onPress={goBack} style={styles.roundBtn} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </PressableScale>
        <PressableScale onPress={share} style={styles.roundBtn} accessibilityLabel="Share">
          <Ionicons name="share-outline" size={20} color="#fff" />
        </PressableScale>
      </View>

      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: HERO - 40, paddingBottom: insets.bottom + 40 }}>
        <View style={[styles.sheet, { backgroundColor: c.bg }]}>
          <View style={styles.inner}>
            <Animated.View entering={FadeInUp.duration(450)} style={styles.badges}>
              <Badge label={meta.label} color={tint} />
              {place.subcategory && <Badge label={place.subcategory} color={c.muted} />}
              {place.featuredLabel && <Badge label={place.featuredLabel} color={c.orange} />}
            </Animated.View>
            <Animated.Text entering={FadeInUp.delay(60).duration(450)} style={[styles.name, { color: c.ink }]}>{place.name}</Animated.Text>
            {(place.ownership || place.brand || place.type) && (
              <Text style={[styles.subline, { color: tint }]}>{[place.ownership, place.brand, place.type].filter(Boolean).join(' · ')}</Text>
            )}
            <View style={styles.viewsRow}>
              <Ionicons name="location" size={14} color={c.muted} />
              <Text style={[styles.viewsText, { color: c.muted }]}>{place.taluk} taluk</Text>
              {place.views > 0 && (
                <>
                  <Text style={{ color: c.muted }}>·</Text>
                  <Ionicons name="eye-outline" size={14} color={c.muted} />
                  <Text style={[styles.viewsText, { color: c.muted }]}>{place.views.toLocaleString()} views</Text>
                </>
              )}
            </View>

            {/* Actions */}
            <Animated.View entering={FadeInDown.delay(120).springify().damping(16)} style={styles.actions}>
              <Action icon="call" label="Call" color={c.leaf} disabled={!tel} onPress={call} />
              <Action icon="navigate" label="Directions" color={c.sky} onPress={directions} />
              <Action icon="share-social" label="Share" color={c.violet} onPress={share} />
            </Animated.View>

            {/* Details */}
            <Animated.View entering={FadeInDown.delay(180).duration(450)} style={[styles.card, { backgroundColor: c.card, borderColor: c.line }, shadow(c)]}>
              {place.address && <InfoRow icon="location-outline" label="Address" value={place.address} />}
              <InfoRow icon="call-outline" label="Phone" value={place.phone ?? 'Not listed'} onPress={tel ? call : undefined} />
              <InfoRow icon="map-outline" label="Area" value={`${place.taluk} taluk, Dharmapuri district`} last />
            </Animated.View>

            {place.description && (
              <Animated.View entering={FadeInDown.delay(220).duration(450)} style={styles.block}>
                <Text style={[styles.blockTitle, { color: c.ink }]}>About</Text>
                <Text style={[styles.body, { color: c.ink }]}>{place.description}</Text>
              </Animated.View>
            )}
            {place.howToReach && (
              <Animated.View entering={FadeInDown.delay(260).duration(450)} style={styles.block}>
                <Text style={[styles.blockTitle, { color: c.ink }]}>How to reach</Text>
                <Text style={[styles.body, { color: c.ink }]}>{place.howToReach}</Text>
              </Animated.View>
            )}
            {place.image && (
              <Text style={[styles.credit, { color: c.muted }]}>{place.image.credit} · {place.image.license}</Text>
            )}

            <AdBanner />

            {nearby.length > 0 && (
              <View style={styles.block}>
                <Text style={[styles.blockTitle, { color: c.ink }]}>More {meta.label.toLowerCase()} in {place.taluk}</Text>
                <View style={{ gap: space.md }}>
                  {nearby.map((p) => <PlaceCard key={p.id} place={p} />)}
                </View>
              </View>
            )}

            <PressableScale onPress={() => router.push('/submit')} scaleTo={0.98} style={[styles.report, { borderColor: c.line }]}>
              <Ionicons name="create-outline" size={16} color={c.muted} />
              <Text style={{ color: c.muted, fontSize: 13 }}>Details wrong or missing? Suggest an update</Text>
            </PressableScale>
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function Action({ icon, label, color, onPress, disabled }: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityLabel={label} containerStyle={{ flex: 1 }}
      style={[styles.action, { backgroundColor: c.card, borderColor: c.line }, shadow(c)]}>
      <View style={[styles.actionIcon, { backgroundColor: color + '1f' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.actionLabel, { color: c.ink }]}>{label}</Text>
    </PressableScale>
  );
}

function InfoRow({ icon, label, value, onPress, last }: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const { c } = useTheme();
  const content = (
    <View style={[styles.infoRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line }]}>
      <Ionicons name={icon} size={18} color={c.muted} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: c.muted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: onPress ? c.leaf : c.ink }]}>{value}</Text>
      </View>
    </View>
  );
  return onPress ? <PressableScale onPress={onPress} scaleTo={0.99}>{content}</PressableScale> : content;
}

const styles = StyleSheet.create({
  hero: { position: 'absolute', top: 0, left: 0, right: 0, height: HERO, overflow: 'hidden' },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, justifyContent: 'center', paddingHorizontal: 64 },
  barTitle: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  topButtons: { position: 'absolute', left: space.lg, right: space.lg, zIndex: 3, flexDirection: 'row', justifyContent: 'space-between' },
  roundBtn: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: space.xl, minHeight: 600 },
  inner: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: space.lg },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  name: { fontSize: 28, fontWeight: '900', letterSpacing: -0.6, marginTop: space.md, lineHeight: 33 },
  subline: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  viewsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: space.sm },
  viewsText: { fontSize: 13 },
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  action: { alignItems: 'center', gap: 8, paddingVertical: space.lg, borderRadius: radius.lg, borderWidth: 1 },
  actionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '700' },
  card: { marginTop: space.xl, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: space.lg },
  infoRow: { flexDirection: 'row', gap: space.md, paddingVertical: space.lg },
  infoLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 15, lineHeight: 21 },
  block: { marginTop: space.xl },
  blockTitle: { fontSize: 17, fontWeight: '800', marginBottom: space.sm },
  body: { fontSize: 15, lineHeight: 23 },
  credit: { fontSize: 11.5, marginTop: space.md },
  report: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: space.xxl, paddingVertical: space.md, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed',
  },
});
