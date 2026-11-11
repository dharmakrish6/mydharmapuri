import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_BY_KEY } from '@/lib/categories';
import type { Place } from '@/lib/types';
import { radius, shadow, space, useTheme } from '@/theme';
import { PressableScale } from './ui';

/** Row card used in category and search lists. */
export function PlaceCard({ place }: { place: Place }) {
  const { c } = useTheme();
  const meta = CATEGORY_BY_KEY[place.category];
  const tint = c[meta.color];
  return (
    <PressableScale
      onPress={() => router.push(`/place/${place.id}`)}
      scaleTo={0.98}
      accessibilityLabel={place.name}
      style={[styles.card, { backgroundColor: c.card, borderColor: c.line }, shadow(c)]}
    >
      <LinearGradient colors={[tint, tint + 'aa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.thumb}>
        {place.image ? (
          <Image source={place.image.url} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
        ) : (
          <Ionicons name={meta.icon} size={24} color="#fff" />
        )}
      </LinearGradient>
      <View style={styles.body}>
        <Text style={[styles.name, { color: c.ink }]} numberOfLines={2}>{place.name}</Text>
        {(place.subcategory || place.ownership || place.brand) && (
          <Text style={[styles.sub, { color: tint }]} numberOfLines={1}>
            {[place.subcategory, place.ownership ?? place.brand].filter(Boolean).join(' · ')}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={c.muted} />
          <Text style={[styles.meta, { color: c.muted }]} numberOfLines={1}>
            {place.address ?? place.taluk}
          </Text>
        </View>
        {place.phone && (
          <View style={styles.metaRow}>
            <Ionicons name="call-outline" size={13} color={c.leaf} />
            <Text style={[styles.meta, { color: c.leaf, fontWeight: '700' }]}>{place.phone}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.muted} style={{ alignSelf: 'center' }} />
    </PressableScale>
  );
}

/** Large gradient card for the home page's "Frequently looked up" carousel. */
export function FeaturedCard({ place }: { place: Place }) {
  const { c } = useTheme();
  const meta = CATEGORY_BY_KEY[place.category];
  const tint = c[meta.color];
  return (
    <PressableScale
      onPress={() => router.push(`/place/${place.id}`)}
      accessibilityLabel={place.name}
      style={[styles.featured, shadow(c, 2)]}
    >
      <LinearGradient colors={[tint, tint + 'cc', '#00000066']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {place.image && (
        <>
          <Image source={place.image.url} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={StyleSheet.absoluteFill} />
        </>
      )}
      <View style={styles.featuredTop}>
        <View style={styles.featuredIcon}>
          <Ionicons name={meta.icon} size={16} color="#fff" />
        </View>
        {place.featuredLabel && (
          <View style={styles.featuredLabel}>
            <Text style={styles.featuredLabelText}>{place.featuredLabel}</Text>
          </View>
        )}
      </View>
      <View>
        <Text style={styles.featuredCat}>{meta.label}</Text>
        <Text style={styles.featuredName} numberOfLines={2}>{place.name}</Text>
        <Text style={styles.featuredMeta} numberOfLines={1}>
          {place.phone ?? place.taluk}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  body: { flex: 1, gap: 3 },
  name: { fontSize: 15.5, fontWeight: '700', lineHeight: 20 },
  sub: { fontSize: 12, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 12.5, flexShrink: 1 },
  featured: {
    width: 200,
    height: 230,
    borderRadius: radius.xl,
    overflow: 'hidden',
    padding: space.lg,
    justifyContent: 'space-between',
  },
  featuredTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  featuredIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredLabel: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  featuredLabelText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  featuredCat: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  featuredName: { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 22, marginTop: 4 },
  featuredMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, marginTop: 6 },
});
