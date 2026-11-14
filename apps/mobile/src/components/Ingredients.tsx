import { StyleSheet, View } from 'react-native';
import type { BagItem } from '@mago/shared';
import { Txt } from '@/components/Txt';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';

type WithIngredients = Pick<BagItem, 'ingredients' | 'ingredientNotes'>;

/** D-28: one line under a product — notes first ("Contains fragrance"), then the top ingredients. */
export function IngredientsLine({ item, max = 3 }: { item: WithIngredients; max?: number }) {
  const notes = item.ingredientNotes ?? [];
  const list = item.ingredients ?? [];
  if (!notes.length && !list.length) return null;
  const more = list.length > max ? ` +${list.length - max}` : '';
  const text = [notes.join(' · '), list.length ? `Key ingredients: ${list.slice(0, max).join(', ')}${more}` : ''].filter(Boolean).join(' — ');
  return (
    <Txt variant="footnote" tone="secondary" numberOfLines={2}>
      {text}
    </Txt>
  );
}

/** D-28: the full ingredients panel on a product page. */
export function IngredientsCard({ item }: { item: WithIngredients }) {
  const { c } = useTheme();
  const notes = item.ingredientNotes ?? [];
  const list = item.ingredients ?? [];
  return (
    <View style={[styles.card, { backgroundColor: c.surface }]}>
      <Txt variant="headline" accessibilityRole="header">
        Key ingredients
      </Txt>
      {notes.length ? (
        <View style={styles.notes}>
          {notes.map((n) => (
            <View key={n} style={[styles.note, { backgroundColor: c.surfaceAlt }]}>
              <Txt variant="footnote" style={{ fontWeight: '600' }}>
                {n}
              </Txt>
            </View>
          ))}
        </View>
      ) : null}
      {list.length ? (
        <View style={{ gap: space.xs }}>
          {list.map((ing, i) => (
            <Txt key={ing} variant="callout">
              {i + 1}. {ing}
            </Txt>
          ))}
        </View>
      ) : (
        <Txt variant="callout" tone="secondary">
          We couldn’t find this product’s ingredients. They’re printed on the box or the back of the product.
        </Txt>
      )}
      {list.length || notes.length ? (
        <Txt variant="footnote" tone="secondary">
          From the product’s usual formula. Formulas change and differ by shade — the label on your product is the final word, especially if you have allergies.
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: space.l, gap: space.m },
  notes: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  note: { borderRadius: radius.chip, paddingHorizontal: space.m, paddingVertical: space.xs },
});
