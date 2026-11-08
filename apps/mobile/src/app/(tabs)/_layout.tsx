import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/design/theme';
import { layout, softShadow, space } from '@/design/tokens';
import { Icon, type IconName } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { PressableScale } from '@/components/PressableScale';
import { haptic } from '@/design/haptics';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Today', icon: 'home' },
  library: { label: 'Library', icon: 'library' },
  discover: { label: 'Discover', icon: 'compass' },
  me: { label: 'Me', icon: 'person' },
};

/**
 * Ulta-style labeled 5-slot tab bar: Today · Library · (+) · Discover · Me.
 * Active tab changes three things: plum color, bolder label, gold dot. Inactive keeps ≥ 3:1.
 */
function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const items = state.routes.map((r, i) => ({ route: r, i }));
  const render = ({ route, i }: { route: (typeof state.routes)[number]; i: number }) => {
    const meta = TABS[route.name];
    if (!meta) return null;
    const active = state.index === i;
    return (
      <PressableScale
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={meta.label}
        onPress={() => {
          if (!active) haptic.select();
          navigateToTab(route.key);
        }}
        style={styles.tab}
      >
        <Icon name={meta.icon} size={24} color={active ? c.ink : c.inkSecondary} />
        <Txt variant="tab" style={{ color: active ? c.ink : c.inkSecondary, fontFamily: active ? 'DMSans_700Bold' : 'DMSans_500Medium' }}>
          {meta.label}
        </Txt>
        <View style={[styles.dot, { backgroundColor: active ? c.accent : 'transparent' }]} />
      </PressableScale>
    );
  };
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.s), borderTopColor: c.hairline }]}>
      {Platform.OS !== 'android' ? <BlurView intensity={40} tint={c.blurTint} style={StyleSheet.absoluteFill} /> : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'android' ? c.bg : c.glass }]} />
      <View style={styles.row}>
        {items.slice(0, 2).map(render)}
        <PressableScale
          accessibilityLabel="Add a look"
          accessibilityHint="Paste a link, upload a video or write a routine"
          onPress={() => {
            haptic.select();
            router.push('/add');
          }}
          style={[styles.add, { backgroundColor: c.primary }, softShadow(c, 'raised')]}
        >
          <Icon name="plus" size={26} color={c.inkOnPrimary} />
        </PressableScale>
        {items.slice(2).map(render)}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="me" options={{ title: 'Me' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, overflow: 'visible' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: space.s,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  tab: { minWidth: 64, minHeight: 50, alignItems: 'center', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  add: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: -14 },
});
