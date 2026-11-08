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
  library: { label: 'Looks', icon: 'bookmark' },
  discover: { label: 'Discover', icon: 'compass' },
  me: { label: 'Me', icon: 'person' },
};

/**
 * Floating glass tab bar (Porter editorial): a rounded pill that floats above the home
 * indicator, content scrolls underneath. Today · Looks · (+) · Discover · Me.
 * Active tab changes two things: filled icon + ink color, semibold label.
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
    const col = active ? c.ink : c.inkSecondary;
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
        <Icon name={meta.icon} size={24} color={col} filled={active} />
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
          accessibilityLabel="Add a tutorial"
          accessibilityHint="Paste a link, upload a video or write a routine"
          onPress={() => {
            haptic.select();
            router.push('/add');
          }}
          style={[styles.add, { backgroundColor: c.primary }]}
        >
          <Icon name="plus" size={22} color={c.inkOnPrimary} strokeWidth={1.75} />
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
      <Tabs.Screen name="library" options={{ title: 'Looks' }} />
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
  add: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 },
});
