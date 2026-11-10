import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '@/design/theme';

/** One icon set: thin 1.5px outline, plum (ink) by default. */
export type IconName =
  | 'home'
  | 'library'
  | 'plus'
  | 'compass'
  | 'person'
  | 'search'
  | 'chevronRight'
  | 'chevronLeft'
  | 'close'
  | 'play'
  | 'link'
  | 'upload'
  | 'pencil'
  | 'heart'
  | 'check'
  | 'calendar'
  | 'sparkle'
  | 'mic'
  | 'speaker'
  | 'camera'
  | 'clock'
  | 'share'
  | 'gift'
  | 'settings'
  | 'lock'
  | 'trash'
  | 'download'
  | 'cloud'
  | 'bell'
  | 'star'
  | 'bookmark'
  | 'wifiOff'
  | 'info'
  | 'pin'
  | 'refresh'
  | 'wand'
  | 'sliders'
  | 'bag'
  | 'list';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color, filled = false, strokeWidth = 1.5 }: Props) {
  const { c } = useTheme();
  const col = color ?? c.ink;
  const p = { stroke: col, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const fillOr = filled ? col : 'none';
  let body: React.ReactNode;
  switch (name) {
    case 'home':
      body = <Path {...p} fill={fillOr} d="M4 10.5L12 4l8 6.5V20h-5v-6H9v6H4z" />;
      break;
    case 'library':
      body = (
        <>
          <Rect {...p} fill={fillOr} x={4} y={3} width={6} height={18} rx={1.5} />
          <Path {...p} d="M14 4.5l4.2-1.1 3 16.6-4.2 1.1z" />
        </>
      );
      break;
    case 'sliders':
      body = (
        <>
          <Path {...p} d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <Circle {...p} cx={16} cy={7} r={2} />
          <Circle {...p} cx={10} cy={17} r={2} />
        </>
      );
      break;
    case 'bag':
      body = (
        <>
          <Path {...p} fill={fillOr} d="M5.5 8h13l-1 12h-11z" />
          <Path {...p} d="M9 8V6.5a3 3 0 0 1 6 0V8" />
        </>
      );
      break;
    case 'list':
      body = <Path {...p} d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />;
      break;
    case 'plus':
      body = <Path {...p} d="M12 5v14M5 12h14" />;
      break;
    case 'compass':
      body = (
        <>
          <Circle {...p} cx={12} cy={12} r={9} />
          <Path {...p} fill={fillOr} d="M15.5 8.5l-2 5-5 2 2-5z" />
        </>
      );
      break;
    case 'person':
      body = (
        <>
          <Circle {...p} fill={fillOr} cx={12} cy={8} r={4} />
          <Path {...p} d="M4.5 20c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
        </>
      );
      break;
    case 'search':
      body = (
        <>
          <Circle {...p} cx={11} cy={11} r={7} />
          <Path {...p} d="M20 20l-3.5-3.5" />
        </>
      );
      break;
    case 'chevronRight':
      body = <Path {...p} d="M9 5l7 7-7 7" />;
      break;
    case 'chevronLeft':
      body = <Path {...p} d="M15 5l-7 7 7 7" />;
      break;
    case 'close':
      body = <Path {...p} d="M6 6l12 12M18 6L6 18" />;
      break;
    case 'play':
      body = <Path {...p} fill={fillOr} d="M8 5.5v13l11-6.5z" />;
      break;
    case 'link':
      body = (
        <>
          <Path {...p} d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
          <Path {...p} d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
        </>
      );
      break;
    case 'upload':
      body = (
        <>
          <Path {...p} d="M12 16V4M7 9l5-5 5 5" />
          <Path {...p} d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </>
      );
      break;
    case 'download':
      body = (
        <>
          <Path {...p} d="M12 4v12M7 11l5 5 5-5" />
          <Path {...p} d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </>
      );
      break;
    case 'pencil':
      body = (
        <>
          <Path {...p} d="M4 20h4L19 9l-4-4L4 16z" />
          <Path {...p} d="M13.5 6.5l4 4" />
        </>
      );
      break;
    case 'heart':
      body = (
        <Path
          {...p}
          fill={fillOr}
          d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
        />
      );
      break;
    case 'check':
      body = <Path {...p} d="M5 12.5l4.5 4.5L19 7.5" />;
      break;
    case 'calendar':
      body = (
        <>
          <Rect {...p} x={4} y={5} width={16} height={15} rx={2} />
          <Path {...p} d="M4 10h16M8 3v4M16 3v4" />
        </>
      );
      break;
    case 'sparkle':
      body = <Path {...p} fill={fillOr} d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />;
      break;
    case 'wand':
      body = (
        <>
          <Path {...p} d="M4 20L15 9M13 7l4 4" />
          <Path {...p} d="M18 3v3M16.5 4.5h3M20 9v2M19 10h2" />
        </>
      );
      break;
    case 'mic':
      body = (
        <>
          <Rect {...p} fill={fillOr} x={9} y={3} width={6} height={11} rx={3} />
          <Path {...p} d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
        </>
      );
      break;
    case 'speaker':
      body = (
        <>
          <Path {...p} fill={fillOr} d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
          <Path {...p} d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
        </>
      );
      break;
    case 'camera':
      body = (
        <>
          <Path {...p} d="M4 8h3l1.5-2.5h7L17 8h3v11H4z" />
          <Circle {...p} cx={12} cy={13} r={3.5} />
        </>
      );
      break;
    case 'clock':
      body = (
        <>
          <Circle {...p} cx={12} cy={12} r={9} />
          <Path {...p} d="M12 7v5l3 2" />
        </>
      );
      break;
    case 'share':
      body = (
        <>
          <Path {...p} d="M12 3v12M8 7l4-4 4 4" />
          <Path {...p} d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
        </>
      );
      break;
    case 'gift':
      body = (
        <>
          <Rect {...p} x={4} y={9} width={16} height={11} rx={1.5} />
          <Path {...p} d="M3 9h18M12 9v11M12 9c-1.5-3-5-3.5-5-1.2C7 9 12 9 12 9zm0 0c1.5-3 5-3.5 5-1.2C17 9 12 9 12 9z" />
        </>
      );
      break;
    case 'settings':
      body = (
        <>
          <Circle {...p} cx={12} cy={12} r={3} />
          <Path
            {...p}
            d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"
          />
        </>
      );
      break;
    case 'lock':
      body = (
        <>
          <Rect {...p} x={5} y={11} width={14} height={9} rx={2} />
          <Path {...p} d="M8 11V8a4 4 0 0 1 8 0v3" />
        </>
      );
      break;
    case 'trash':
      body = <Path {...p} d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13" />;
      break;
    case 'cloud':
      body = <Path {...p} d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z" />;
      break;
    case 'bell':
      body = (
        <>
          <Path {...p} d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
          <Path {...p} d="M10 20.5a2 2 0 0 0 4 0" />
        </>
      );
      break;
    case 'star':
      body = <Path {...p} fill={fillOr} d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" />;
      break;
    case 'bookmark':
      body = <Path {...p} fill={fillOr} d="M6 4h12v16l-6-4-6 4z" />;
      break;
    case 'wifiOff':
      body = (
        <>
          <Path {...p} d="M3 3l18 18" />
          <Path {...p} d="M5 9.5a11 11 0 0 1 4-2.2M19 9.5a11 11 0 0 0-6.5-2.9M8 13a6 6 0 0 1 3-1.5M16 13a6 6 0 0 0-1.4-1" />
          <Circle {...p} fill={col} cx={12} cy={17.5} r={1} />
        </>
      );
      break;
    case 'info':
      body = (
        <>
          <Circle {...p} cx={12} cy={12} r={9} />
          <Path {...p} d="M12 11v5" />
          <Circle cx={12} cy={8} r={1} fill={col} />
        </>
      );
      break;
    case 'pin':
      body = <Path {...p} fill={fillOr} d="M9 4h6l-1 5 3 3H7l3-3zM12 12v8" />;
      break;
    case 'refresh':
      body = (
        <>
          <Path {...p} d="M19 12a7 7 0 1 1-2-4.9" />
          <Path {...p} d="M19 4v4h-4" />
        </>
      );
      break;
  }
  // Wrapped in a View so it stacks above frosted-glass layers on web.
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {body}
      </Svg>
    </View>
  );
}
