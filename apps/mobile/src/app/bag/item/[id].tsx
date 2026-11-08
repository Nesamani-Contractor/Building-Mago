import { useState } from 'react';
import { View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, TopBar } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { BagItemForm, type Draft } from '@/components/BagItemForm';
import { space } from '@/design/tokens';
import { useBag } from '@/data/bag';

/** Edit or remove one product in the bag. */
export default function BagItemEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const item = useBag((s) => s.items.find((i) => i.id === id));
  const update = useBag((s) => s.update);
  const remove = useBag((s) => s.remove);
  const [draft, setDraft] = useState<Draft | undefined>(item);

  if (!item || !draft) return <Redirect href="/bag" />;

  return (
    <Screen
      header={<TopBar title="Edit product" />}
      footer={
        <View style={{ gap: space.s }}>
          <Button
            label="Save changes"
            disabled={!draft.name.trim()}
            onPress={() => {
              update(item.id, { ...draft, name: draft.name.trim() });
              router.back();
            }}
          />
          <Button
            variant="ghost"
            icon="trash"
            label="Remove from my bag"
            onPress={() => {
              remove(item.id);
              router.back();
            }}
          />
        </View>
      }
    >
      <Card style={{ marginTop: space.l }}>
        <BagItemForm value={draft} onChange={setDraft} />
      </Card>
    </Screen>
  );
}
