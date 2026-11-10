import { View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { productKind, type ProductRef } from '@mago/shared';
import { useTheme } from '@/design/theme';
import { palette } from '@/design/tokens';

/**
 * Product picture. Uses a real catalog photo when `imageUrl` exists; otherwise a clean illustration
 * of the product type, filled with its shade. (Illustrations, not photos of any brand's product.)
 */
export function ProductArt({ product, size = 72, bare }: { product: ProductRef; size?: number; /** No background well — for compositions. */ bare?: boolean }) {
  const { c } = useTheme();
  if (product.imageUrl) {
    return (
      <Image
        source={{ uri: product.imageUrl }}
        style={{ width: size, height: size, borderRadius: size * 0.22, backgroundColor: c.surfaceAlt }}
        contentFit="contain"
        accessibilityLabel={product.name}
      />
    );
  }
  const shade = product.shadeHex ?? palette.blushTop;
  const ink = palette.ink;
  const body = '#F4EEEA';
  const cap = '#3A2A33';
  const s = { stroke: ink, strokeWidth: 1.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const kind = productKind(product);

  let art: React.ReactNode;
  switch (kind) {
    case 'lipstick':
      art = (
        <G {...s}>
          <Rect x={23} y={34} width={18} height={24} rx={2} fill={cap} />
          <Rect x={25} y={24} width={14} height={11} rx={1.5} fill={body} />
          <Path d="M27 24V14l10-6v16z" fill={shade} />
        </G>
      );
      break;
    case 'gloss':
      art = (
        <G {...s}>
          <Rect x={25} y={22} width={14} height={36} rx={5} fill={shade} fillOpacity={0.85} />
          <Rect x={26} y={8} width={12} height={15} rx={2} fill={cap} />
          <Path d="M29 30h0M29 36v14" stroke="#FFFFFF" strokeOpacity={0.8} />
        </G>
      );
      break;
    case 'pencil':
      art = (
        <G {...s}>
          <Path d="M18 50L42 14l6 4-24 36z" fill={body} />
          <Path d="M42 14l6 4 3-8z" fill={shade} />
          <Path d="M18 50l6 4-7 4z" fill={cap} />
        </G>
      );
      break;
    case 'mascara':
      art = (
        <G {...s}>
          <Rect x={14} y={27} width={26} height={10} rx={3} fill={cap} />
          <Path d="M40 32h8" />
          <Rect x={47} y={28} width={7} height={8} rx={3} fill={shade} />
          <Path d="M48 26v-2M51 26v-2M48 38v2M51 38v2" />
        </G>
      );
      break;
    case 'palette':
      art = (
        <G {...s}>
          <Circle cx={32} cy={33} r={20} fill={body} />
          <Circle cx={32} cy={33} r={14} fill={shade} />
          <Path d="M24 27c3-3 7-4 11-3" stroke="#FFFFFF" strokeOpacity={0.7} />
        </G>
      );
      break;
    case 'brush':
      art = (
        <G {...s}>
          <Path d="M20 54L36 30" strokeWidth={5} stroke={cap} />
          <Path d="M34 28l5 4-3 3-5-4z" fill={body} />
          <Path d="M38 31c2-6 7-12 12-14 1 6-3 13-9 17z" fill={shade} />
        </G>
      );
      break;
    case 'sponge':
      art = (
        <G {...s}>
          <Path d="M32 10c9 0 15 14 15 26 0 9-7 16-15 16s-15-7-15-16c0-12 6-26 15-26z" fill={shade === palette.blushTop ? '#F2B9C4' : shade} />
        </G>
      );
      break;
    case 'bottle':
      art = (
        <G {...s}>
          <Rect x={21} y={24} width={22} height={32} rx={4} fill={shade} />
          <Rect x={27} y={16} width={10} height={8} fill={body} />
          <Rect x={25} y={8} width={14} height={8} rx={2} fill={cap} />
          <Rect x={25} y={34} width={14} height={10} rx={1} fill="#FFFFFF" fillOpacity={0.55} />
        </G>
      );
      break;
    case 'tube':
      art = (
        <G {...s}>
          <Path d="M22 12h20l-3 34H25z" fill={shade === palette.blushTop ? body : shade} />
          <Rect x={25} y={46} width={14} height={10} rx={2} fill={cap} />
          <Path d="M24 18h16" />
        </G>
      );
      break;
    case 'pot':
      art = (
        <G {...s}>
          <Rect x={14} y={30} width={36} height={20} rx={5} fill={body} />
          <Ellipse cx={32} cy={30} rx={18} ry={6} fill={shade} />
          <Rect x={14} y={18} width={36} height={8} rx={3} fill={cap} />
        </G>
      );
      break;
    case 'spray':
      art = (
        <G {...s}>
          <Rect x={20} y={22} width={24} height={34} rx={6} fill={shade === palette.blushTop ? '#EFE4F2' : shade} />
          <Rect x={27} y={12} width={10} height={10} rx={2} fill={cap} />
          <Path d="M37 15h5M44 12l3-2M44 17l3 2" />
        </G>
      );
      break;
    default:
      art = (
        <G {...s}>
          <Path d="M16 40c6-12 26-12 32 0" fill="none" strokeWidth={2} />
          <Circle cx={18} cy={44} r={4} fill={body} />
          <Circle cx={46} cy={44} r={4} fill={body} />
          <Path d="M24 30l-2-5M32 28v-6M40 30l2-5" />
        </G>
      );
  }

  return (
    <View
      style={{ width: size, height: size, borderRadius: size * 0.22, backgroundColor: bare ? 'transparent' : c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={product.name}
    >
      <Svg width={size * 0.86} height={size * 0.86} viewBox="0 0 64 64">
        {art}
      </Svg>
    </View>
  );
}
