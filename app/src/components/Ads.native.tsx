import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import type * as GMA from 'react-native-google-mobile-ads';
import { radius, shadow, space, useTheme } from '@/theme';

// The AdMob native module is missing in Expo Go; load it lazily so the app still runs there.
let ads: typeof GMA | null = null;
try {
  ads = require('react-native-google-mobile-ads') as typeof GMA;
} catch {
  ads = null;
}

/** Real ad units come from EXPO_PUBLIC_ADMOB_* (eas.json); dev builds and missing values use Google's test ads. */
function unit(kind: 'banner' | 'native'): string | null {
  if (!ads) return null;
  const real = Platform.select({
    android: kind === 'banner' ? process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID : process.env.EXPO_PUBLIC_ADMOB_NATIVE_ANDROID,
    ios: kind === 'banner' ? process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS : process.env.EXPO_PUBLIC_ADMOB_NATIVE_IOS,
  });
  if (!__DEV__ && real) return real;
  return kind === 'banner' ? ads.TestIds.ADAPTIVE_BANNER : ads.TestIds.NATIVE;
}

const AdsReady = createContext(false);

/** Asks for ad consent where the law requires it (EEA/UK), then starts the AdMob SDK. */
export function AdsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!ads) return;
    let cancelled = false;
    (async () => {
      try {
        const consent = await ads.AdsConsent.gatherConsent();
        if (!consent.canRequestAds) return;
        await ads.default().setRequestConfiguration({ maxAdContentRating: ads.MaxAdContentRating.PG });
        await ads.default().initialize();
        if (!cancelled) setReady(true);
      } catch {
        // No ads this session (offline, consent form failed…) — the app works without them.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return <AdsReady.Provider value={ready}>{children}</AdsReady.Provider>;
}

/** Adaptive banner sized to the container width. Collapses to nothing until an ad loads. */
export function AdBanner({ style }: { style?: object }) {
  const ready = useContext(AdsReady);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const id = unit('banner');
  if (!ads || !ready || !id || failed) return null;
  const { BannerAd, BannerAdSize } = ads;
  return (
    <View style={[styles.banner, !loaded && styles.collapsed, style]}>
      <BannerAd
        unitId={id}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

/** A native ad laid out like a place card, clearly labelled "Ad". Renders nothing until filled. */
export function NativeAdCard({ style }: { style?: object }) {
  const ready = useContext(AdsReady);
  const id = unit('native');
  if (!ads || !id) return null;
  return <NativeAdInner unitId={id} ready={ready} style={style} lib={ads} />;
}

function NativeAdInner({ unitId, ready, style, lib }: { unitId: string; ready: boolean; style?: object; lib: typeof GMA }) {
  const { c } = useTheme();
  const { status, nativeAd } = lib.useNativeAd({ adUnitId: unitId, autoLoad: ready });
  if (status !== 'loaded' || !nativeAd) return null;
  const { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } = lib;
  return (
    <NativeAdView nativeAd={nativeAd} style={[styles.card, { backgroundColor: c.card, borderColor: c.line }, shadow(c), style]}>
      <View style={styles.row}>
        {nativeAd.icon && (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
          </NativeAsset>
        )}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.adTag, { backgroundColor: c.gold, color: '#fff' }]}>Ad</Text>
            {nativeAd.advertiser && (
              <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                <Text style={[styles.advertiser, { color: c.muted }]} numberOfLines={1}>{nativeAd.advertiser}</Text>
              </NativeAsset>
            )}
          </View>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={[styles.headline, { color: c.ink }]} numberOfLines={2}>{nativeAd.headline}</Text>
          </NativeAsset>
          {!!nativeAd.body && (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text style={[styles.text, { color: c.muted }]} numberOfLines={2}>{nativeAd.body}</Text>
            </NativeAsset>
          )}
        </View>
      </View>
      {nativeAd.mediaContent && <NativeMediaView style={styles.media} resizeMode="cover" />}
      {!!nativeAd.callToAction && (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <Text style={[styles.cta, { backgroundColor: c.ink, color: c.bg }]}>{nativeAd.callToAction}</Text>
        </NativeAsset>
      )}
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  banner: { alignItems: 'center', marginTop: space.lg, overflow: 'hidden' },
  collapsed: { height: 0, marginTop: 0 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: space.md, gap: space.md },
  row: { flexDirection: 'row', gap: space.md },
  icon: { width: 64, height: 64, borderRadius: radius.md },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adTag: { fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  advertiser: { fontSize: 12, flexShrink: 1 },
  headline: { fontSize: 15.5, fontWeight: '700', lineHeight: 20 },
  text: { fontSize: 12.5 },
  media: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md, overflow: 'hidden' },
  cta: { alignSelf: 'flex-start', fontWeight: '800', fontSize: 13, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, overflow: 'hidden' },
});
