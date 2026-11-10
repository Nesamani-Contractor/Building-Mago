import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/design/theme';
import { fonts, layout, space } from '@/design/tokens';
import { Icon, type IconName } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { PressableScale } from '@/components/PressableScale';
import { haptic } from '@/design/haptics';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'home' },
  discover: { label: 'Discover', icon: 'compass' },
  library: { label: 'Library', icon: 'bookmark' },
  me: { label: 'Profile', icon: 'person' },
};
const ORDER = ['index', 'discover', 'library', 'me'];

/**
 * Rose tab bar: white, hairline top, Home · Discover · (+) · Library · Profile.
 * Active tab = rose, filled icon, semibold label. The centre + adds a tutorial.
 */
function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const items = state.routes.map((r, i) => ({ route: r, i })).sort((a, b) => ORDER.indexOf(a.route.name) - ORDER.indexOf(b.route.name));
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
        <Icon name={meta.icon} size={24} color={active ? c.accentDisplay : c.inkSecondary} filled={active} />
        <Txt variant="tab" style={{ color: active ? c.accentText : c.inkSecondary, fontFamily: active ? fonts.sansSemibold : fonts.sansMedium }}>
          {meta.label}
        </Txt>
      </PressableScale>
    );
  };
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.s), borderTopColor: c.hairline, backgroundColor: c.surface, shadowColor: c.shadow }]}>
      <View style={styles.row}>
        {items.slice(0, 2).map(render)}
        <PressableScale
          accessibilityLabel="Add a tutorial"
          accessibilityHint="Paste a link, upload a video or write a routine"
          onPress={() => {
            haptic.select();
            router.push('/add');
          }}
          style={[styles.add, { backgroundColor: c.primary, shadowColor: c.primary }]}
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
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="me" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'visible',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: 6,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3 },
  add: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
