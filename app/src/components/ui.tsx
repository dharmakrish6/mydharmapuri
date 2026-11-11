import { type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { radius, space, useTheme, type ColorKey } from '@/theme';

/** Pressable that springs down slightly when touched. */
export function PressableScale({
  children,
  onPress,
  style,
  containerStyle,
  scaleTo = 0.96,
  haptic = true,
  accessibilityLabel,
  disabled,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Layout style for the outer touch target (e.g. flex: 1 in a row). */
  containerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: boolean;
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      style={containerStyle}
      onPressIn={() => (scale.value = withSpring(scaleTo, { damping: 18, stiffness: 320 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 14, stiffness: 260 }))}
      onPress={() => {
        if (haptic && Platform.OS !== 'web') Haptics.selectionAsync();
        onPress?.();
      }}
    >
      <Animated.View style={[style, animated, disabled && { opacity: 0.5 }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Chip({ label, active, onPress, color = 'leaf', count }: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: ColorKey;
  count?: number;
}) {
  const { c } = useTheme();
  const tint = c[color];
  return (
    <PressableScale onPress={onPress} haptic={false} style={[
      styles.chip,
      { borderColor: active ? tint : c.line, backgroundColor: active ? tint + '22' : c.card },
    ]}>
      <Text style={[styles.chipText, { color: active ? tint : c.ink }]}>{label}</Text>
      {count != null && <Text style={[styles.chipCount, { color: c.muted }]}>{count}</Text>}
    </PressableScale>
  );
}

export function SearchField({ value, onChangeText, placeholder, autoFocus }: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: c.card, borderColor: c.line }]}>
      <Ionicons name="search" size={18} color={c.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        autoFocus={autoFocus}
        returnKeyType="search"
        style={[styles.searchInput, { color: c.ink }]}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={18} color={c.muted} />
        </Pressable>
      )}
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={styles.sectionHead}>
      <Text style={[styles.sectionTitle, { color: c.ink }]}>{title}</Text>
      {action}
    </View>
  );
}

export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, body }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; body: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={c.muted} />
      <Text style={[styles.emptyTitle, { color: c.ink }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: c.muted }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  chipCount: { fontSize: 11, fontWeight: '700' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 15, height: '100%', outlineWidth: 0 } as object,
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
