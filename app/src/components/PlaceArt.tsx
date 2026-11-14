import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { placeArtIcon } from '@/lib/placeIcons';
import type { Place } from '@/lib/types';

type Variant = 'thumb' | 'card' | 'hero';

/**
 * Illustration for a place without a photo: an icon matching its type (biryani, eye care,
 * two-wheelers, police…) drawn over the category gradient the parent provides.
 */
export function PlaceArt({ place, variant }: { place: Pick<Place, 'category' | 'subcategory' | 'name'>; variant: Variant }) {
  const icon = placeArtIcon(place);
  if (variant === 'thumb') {
    return <MaterialIcons name={icon} size={30} color="#fff" />;
  }
  const big = variant === 'hero' ? 132 : 128;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* faint echo top-left, main glyph lower-right */}
      <MaterialIcons name={icon} size={big * 0.45} color="rgba(255,255,255,0.10)" style={[styles.abs, variant === 'hero' ? styles.echoHero : styles.echoCard]} />
      <MaterialIcons name={icon} size={big} color={variant === 'hero' ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.20)'} style={[styles.abs, variant === 'hero' ? styles.mainHero : styles.mainCard]} />
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  echoCard: { top: 56, left: -14, transform: [{ rotate: '-12deg' }] },
  mainCard: { right: -22, top: 18, transform: [{ rotate: '-8deg' }] },
  echoHero: { top: '18%', left: '8%', transform: [{ rotate: '-12deg' }] },
  mainHero: { right: '10%', top: '22%', transform: [{ rotate: '-6deg' }] },
});
