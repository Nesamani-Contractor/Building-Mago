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
import { useSaveDot } from '@/data/library';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'home' },
  library: { label: 'Library', icon: 'bookmark' },
  discover: { label: 'Discover', icon: 'compass' },
  me: { label: 'Me', icon: 'person' },
};

/**
 * Floating glass tab bar (WOW v2): a rounded pill that floats above the home indicator,
 * content scrolls underneath. Home · Library · (+ Unveil) · Discover · Me.
 * Active tab changes two things: filled icon + plum tint, semibold label; inactive at 60%.
 */
function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dot = useSaveDot((s) => s.dot);
  const setDot = useSaveDot((s) => s.setDot);
  const items = state.routes.map((r, i) => ({ route: r, i }));
  const render = ({ route, i }: { route: (typeof state.routes)[number]; i: number }) => {
    const meta = TABS[route.name];
    if (!meta) return null;
    const active = state.index === i;
    const col = active ? c.primary : c.ink;
    const showDot = route.name === 'library' && dot && !active;
    return (
      <PressableScale
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={showDot ? `${meta.label}, new save` : meta.label}
        onPress={() => {
          if (!active) haptic.select();
          if (route.name === 'library') setDot(false);
          navigateToTab(route.key);
        }}
        style={[styles.tab, !active && { opacity: 0.6 }]}
      >
        <View>
          <Icon name={meta.icon} size={24} color={col} filled={active} />
          {showDot ? <View style={[styles.dot, { backgroundColor: c.primary, borderColor: c.surface }]} /> : null}
        </View>
        <Txt variant="tab" style={{ color: col, fontWeight: active ? '600' : '500' }}>
          {meta.label}
        </Txt>
      </PressableScale>
    );
  };
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, space.s) + layout.tabBarFloat }]}>
      <View style={[styles.bar, softShadow(c, 'raised')]}>
        <View style={[StyleSheet.absoluteFill, styles.clip]}>
          {Platform.OS !== 'android' ? <BlurView intensity={50} tint={c.blurTint} style={StyleSheet.absoluteFill} /> : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'android' ? c.surface : c.glass }]} />
        </View>
        {items.slice(0, 2).map(render)}
        <PressableScale
          accessibilityLabel="Unveil a look"
          accessibilityHint="Paste a video link, try a sample, or upload a video"
          onPress={() => {
            haptic.select();
            router.push('/add');
          }}
          style={[styles.add, { backgroundColor: c.primary }]}
        >
          <Icon name="plus" size={22} color={c.inkOnPrimary} strokeWidth={2} />
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
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="me" options={{ title: 'Me' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.l },
  bar: {
    width: '100%',
    maxWidth: 520,
    height: layout.tabBarHeight,
    borderRadius: layout.tabBarHeight / 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  clip: { borderRadius: layout.tabBarHeight / 2, overflow: 'hidden' },
  tab: { flex: 1, minWidth: 44, height: 56, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dot: { position: 'absolute', top: -1, right: -3, width: 9, height: 9, borderRadius: 5, borderWidth: 2 },
  add: { width: 56, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
});
