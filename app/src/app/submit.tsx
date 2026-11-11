import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader, goBack } from '@/components/ScreenHeader';
import { Chip, PressableScale } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { CATEGORIES, CATEGORY_BY_KEY, TALUKS } from '@/lib/categories';
import { firebaseConfigured } from '@/lib/firebase';
import { usePlaces } from '@/lib/places';
import type { CategoryKey } from '@/lib/types';
import { radius, shadow, space, useTheme } from '@/theme';

export default function SubmitScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, ready, canSignIn, signIn, signOut } = useAuth();
  const { submitPlace } = usePlaces();

  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [name, setName] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [taluk, setTaluk] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const valid = category && name.trim().length >= 3 && taluk && address.trim().length >= 5;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => run(async () => {
    if (!user || !valid) return;
    await submitPlace(
      {
        category: category!,
        name: name.trim(),
        subcategory: subcategory.trim() || null,
        taluk: taluk!,
        address: address.trim(),
        phone: phone.trim() || null,
        description: description.trim() || null,
      },
      { uid: user.uid, name: user.displayName, email: user.email },
    );
    setDone(true);
  });

  if (done) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.doneIcon, { backgroundColor: c.leaf }]}>
          <Ionicons name="checkmark" size={48} color="#fff" />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(150)} style={[styles.doneTitle, { color: c.ink }]}>Thanks for adding it!</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(220)} style={[styles.doneBody, { color: c.muted }]}>
          {name} has been sent for review. It will appear in the app once an admin approves it.
        </Animated.Text>
        <Animated.View entering={FadeInDown.delay(300)}>
          <PressableScale onPress={() => router.replace('/')} style={[styles.primary, { backgroundColor: c.ink }]}>
            <Text style={[styles.primaryText, { color: c.bg }]}>Back to home</Text>
          </PressableScale>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <ScreenHeader title="Add a place" subtitle="Every submission is reviewed before it goes live" colors={[c.heroFrom, c.heroTo]} />
        <View style={styles.inner}>
          {!firebaseConfigured ? (
            <Notice c={c} icon="construct-outline" text="Submissions open once the Firebase backend is connected." />
          ) : !ready ? (
            <ActivityIndicator style={{ marginTop: space.xxl }} color={c.leaf} />
          ) : !user ? (
            <Animated.View entering={FadeIn} style={[styles.card, { backgroundColor: c.card, borderColor: c.line }, shadow(c)]}>
              <Ionicons name="person-circle-outline" size={44} color={c.leaf} />
              <Text style={[styles.cardTitle, { color: c.ink }]}>Sign in to add a place</Text>
              <Text style={[styles.cardBody, { color: c.muted }]}>
                We ask you to sign in so we can contact you if a detail needs checking. Your email is never shown publicly.
              </Text>
              <PressableScale disabled={busy || !canSignIn} onPress={() => run(signIn)} style={[styles.google, { borderColor: c.line, backgroundColor: c.bg }]}>
                <Ionicons name="logo-google" size={18} color={c.ink} />
                <Text style={[styles.googleText, { color: c.ink }]}>{busy ? 'Signing in…' : 'Continue with Google'}</Text>
              </PressableScale>
              {!canSignIn && (
                <Text style={[styles.cardBody, { color: c.muted, fontSize: 12 }]}>Google sign-in on phones needs the installed app build (not Expo Go).</Text>
              )}
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn} style={{ gap: space.xl }}>
              <View style={styles.signedIn}>
                <Text style={{ color: c.muted, flex: 1 }} numberOfLines={1}>Signed in as {user.email ?? user.displayName}</Text>
                <PressableScale onPress={() => run(signOut)} haptic={false}><Text style={{ color: c.leaf, fontWeight: '700' }}>Sign out</Text></PressableScale>
              </View>

              <Field label="Category" c={c}>
                <View style={styles.wrap}>
                  {CATEGORIES.map((cat) => (
                    <Chip key={cat.key} label={cat.label} color={cat.color} active={category === cat.key} onPress={() => setCategory(cat.key)} />
                  ))}
                </View>
              </Field>
              <Field label="Name *" c={c}>
                <Input c={c} value={name} onChangeText={setName} placeholder="e.g. Sri Murugan Hotel" />
              </Field>
              {category && CATEGORY_BY_KEY[category].subLabel && (
                <Field label={CATEGORY_BY_KEY[category].subLabel!} c={c}>
                  <Input c={c} value={subcategory} onChangeText={setSubcategory} placeholder="e.g. Biryani, Eye Care, Budget…" />
                </Field>
              )}
              <Field label="Area (taluk) *" c={c}>
                <View style={styles.wrap}>
                  {TALUKS.map((t) => <Chip key={t} label={t} active={taluk === t} onPress={() => setTaluk(t)} />)}
                </View>
              </Field>
              <Field label="Address *" c={c}>
                <Input c={c} value={address} onChangeText={setAddress} placeholder="Door no, street, landmark, PIN" multiline />
              </Field>
              <Field label="Phone" c={c}>
                <Input c={c} value={phone} onChangeText={setPhone} placeholder="Business phone (optional)" keyboardType="phone-pad" />
              </Field>
              <Field label="About" c={c}>
                <Input c={c} value={description} onChangeText={setDescription} placeholder="Anything visitors should know (optional)" multiline />
              </Field>

              <PressableScale disabled={!valid || busy} onPress={submit} style={[styles.primary, { backgroundColor: c.leaf }]}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={[styles.primaryText, { color: '#fff' }]}>Submit for review</Text>}
              </PressableScale>
            </Animated.View>
          )}
          {error && <Notice c={c} icon="alert-circle-outline" text={error} tone="error" />}
          <PressableScale onPress={goBack} haptic={false} style={{ alignSelf: 'center', marginTop: space.xl }}>
            <Text style={{ color: c.muted }}>Cancel</Text>
          </PressableScale>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type C = ReturnType<typeof useTheme>['c'];

function Field({ label, c, children }: { label: string; c: C; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text style={[styles.label, { color: c.ink }]}>{label}</Text>
      {children}
    </View>
  );
}

function Input({ c, multiline, ...props }: React.ComponentProps<typeof TextInput> & { c: C }) {
  return (
    <TextInput
      {...props}
      multiline={multiline}
      placeholderTextColor={c.muted}
      style={[styles.input, { color: c.ink, backgroundColor: c.card, borderColor: c.line }, multiline && { minHeight: 84, textAlignVertical: 'top' }]}
    />
  );
}

function Notice({ c, icon, text, tone }: { c: C; icon: React.ComponentProps<typeof Ionicons>['name']; text: string; tone?: 'error' }) {
  const color = tone === 'error' ? c.crimson : c.gold;
  return (
    <View style={[styles.notice, { backgroundColor: color + '1f', borderColor: color + '55' }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={{ color: c.ink, flex: 1, fontSize: 13.5 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: space.lg, paddingTop: space.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  doneIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  doneTitle: { fontSize: 24, fontWeight: '900' },
  doneBody: { fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 360, marginBottom: space.lg },
  card: { alignItems: 'center', gap: space.md, padding: space.xl, borderRadius: radius.xl, borderWidth: 1 },
  cardTitle: { fontSize: 19, fontWeight: '800' },
  cardBody: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  google: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 22, paddingVertical: 13, marginTop: space.sm,
  },
  googleText: { fontWeight: '700', fontSize: 15 },
  signedIn: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  label: { fontSize: 14, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 15 },
  primary: { alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 999, paddingHorizontal: 28 },
  primaryText: { fontWeight: '800', fontSize: 15.5 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderRadius: radius.md, padding: space.md, marginTop: space.lg },
});
