import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Chip, Eyebrow, LookPhoto, ToggleRow, stepCount } from '@/components/Bits';
import { StateView } from '@/components/States';
import { useTheme } from '@/design/theme';
import { fonts, radius, space } from '@/design/tokens';
import { routineImage } from '@/design/media';
import { haptic } from '@/design/haptics';
import { allUserTags, MAX_TAG_LENGTH, MAX_TAGS, normalizeTags, useLibrary } from '@/data/library';
import { track } from '@/services/analytics';

/**
 * FR-ORG (D-24): "Save to your library". Opens right after a video is turned into steps (and from a
 * look's page to edit later). She picks existing categories or makes a new one, adds her own tags,
 * and can pin it. "Not now" keeps the look in her library unsorted — nothing is ever lost.
 */
export default function SaveToLibrary() {
  const { id, next, edit } = useLocalSearchParams<{ id: string; next?: string; edit?: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const saved = useLibrary((s) => (id ? s.items[id] : undefined));
  const collections = useLibrary((s) => s.collections);
  const items = useLibrary((s) => s.items);
  const isEdit = edit === '1';

  const [cols, setCols] = useState<string[]>(() => saved?.collectionIds ?? []);
  const [tags, setTags] = useState<string[]>(() => saved?.userTags ?? []);
  const [pin, setPin] = useState<boolean>(() => !!saved?.pinned);
  const [tagText, setTagText] = useState('');
  const [newCat, setNewCat] = useState<string | null>(null);
  const [catError, setCatError] = useState<string | null>(null);

  // Suggested tags: her most-used tags first, then the look's own tags from the video.
  const suggestions = useMemo(() => {
    const own = saved?.routine.tags ?? [];
    const have = new Set(tags.map((t) => t.toLowerCase()));
    return normalizeTags([...allUserTags(items), ...own]).filter((t) => !have.has(t.toLowerCase())).slice(0, 8);
  }, [items, saved, tags]);

  const done = () => {
    const target = next ? decodeURIComponent(next) : null;
    if (isEdit || !target) {
      if (router.canGoBack()) router.back();
      else router.replace(`/routine/${id}`);
    } else router.replace(target as never);
  };

  if (!saved || !id) {
    return (
      <Screen header={<TopBar />}>
        <StateView icon="info" title="We can’t find that look" body="It may have been removed. Your other looks are safe." actionLabel="Open Library" onAction={() => router.replace('/(tabs)/library')} />
      </Screen>
    );
  }
  const r = saved.routine;

  function addTag(raw: string) {
    const parts = raw.split(',').map((t) => t.trim()).filter(Boolean);
    if (!parts.length) return;
    setTags((cur) => normalizeTags([...cur, ...parts]));
    setTagText('');
    haptic.select();
  }

  function createCategory() {
    const name = (newCat ?? '').trim();
    if (!name) return setCatError('Give your category a name.');
    const clash = collections.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (clash) {
      setCols((cur) => (cur.includes(clash.id) ? cur : [...cur, clash.id]));
      setNewCat(null);
      setCatError(null);
      return;
    }
    const newId = useLibrary.getState().addCollection(name);
    track('collection_created', {});
    setCols((cur) => [...cur, newId]);
    setNewCat(null);
    setCatError(null);
    haptic.select();
  }

  function save() {
    const pending = tagText.trim() ? normalizeTags([...tags, ...tagText.split(',')]) : tags;
    useLibrary.getState().file(id!, { collectionIds: cols, tags: pending, pinned: pin });
    track('library_filed', { categories: cols.length, tags: pending.length, pinned: pin });
    haptic.success();
    done();
  }

  return (
    <Screen
      header={<TopBar title={isEdit ? 'Organize this look' : undefined} backIcon="close" backLabel={isEdit ? 'Close' : 'Not now'} onBack={isEdit ? undefined : skip} />}
      footer={
        <View style={{ gap: space.s }}>
          <Button label={isEdit ? 'Save changes' : 'Save to library'} onPress={save} />
          {!isEdit ? <Button variant="ghost" label="Not now" onPress={skip} accessibilityHint="Keeps the look in your library without a category" /> : null}
        </View>
      }
    >
      <View style={styles.head}>
        <LookPhoto image={routineImage(r)} style={styles.thumb} />
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow>{isEdit ? 'Your look' : 'Your steps are ready'}</Eyebrow>
          <Txt variant="headline" numberOfLines={2}>
            {r.title}
          </Txt>
          <Txt variant="footnote" tone="secondary">
            {stepCount(r)} steps · {r.totalTimeMin} min
          </Txt>
        </View>
      </View>

      {!isEdit ? (
        <Txt variant="title1" accessibilityRole="header" style={{ marginTop: space.xxl }}>
          Where should it live?
        </Txt>
      ) : null}

      <View style={styles.section}>
        <Txt variant="title3" accessibilityRole="header">
          Category
        </Txt>
        <Txt variant="footnote" tone="secondary">
          Pick one or more, or make a new one.
        </Txt>
        <View style={styles.chips} accessibilityRole="list">
          {collections.map((col) => (
            <Chip key={col.id} label={col.name} selected={cols.includes(col.id)} onPress={() => setCols((cur) => (cur.includes(col.id) ? cur.filter((x) => x !== col.id) : [...cur, col.id]))} />
          ))}
          {newCat === null ? <Chip label="New category" icon="plus" onPress={() => setNewCat('')} /> : null}
        </View>
        {newCat !== null ? (
          <View style={{ gap: space.s }}>
            <TextInput
              autoFocus
              value={newCat}
              onChangeText={(t) => {
                setNewCat(t);
                setCatError(null);
              }}
              placeholder="e.g. Wedding season"
              placeholderTextColor={c.inkSecondary}
              accessibilityLabel="New category name"
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={createCategory}
              style={[styles.input, { color: c.ink, backgroundColor: c.surfaceAlt }]}
            />
            {catError ? (
              <Txt variant="footnote" style={{ color: c.danger }} accessibilityLiveRegion="polite">
                {catError}
              </Txt>
            ) : null}
            <View style={styles.chips}>
              <Chip label="Cancel" onPress={() => setNewCat(null)} />
              <Chip label="Create" selected onPress={createCategory} />
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Txt variant="title3" accessibilityRole="header">
          Your tags
        </Txt>
        <Txt variant="footnote" tone="secondary">
          Words that help you find it later. Tap a tag to remove it.
        </Txt>
        {tags.length ? (
          <View style={styles.chips}>
            {tags.map((t) => (
              <Chip key={t} label={`#${t}`} selected onPress={() => setTags((cur) => cur.filter((x) => x !== t))} />
            ))}
          </View>
        ) : null}
        {tags.length < MAX_TAGS ? (
          <TextInput
            value={tagText}
            onChangeText={(t) => (t.endsWith(',') ? addTag(t) : setTagText(t.slice(0, MAX_TAG_LENGTH)))}
            placeholder="Add a tag, e.g. glowy"
            placeholderTextColor={c.inkSecondary}
            accessibilityLabel="Add a tag"
            returnKeyType="done"
            onSubmitEditing={() => addTag(tagText)}
            blurOnSubmit={false}
            style={[styles.input, { color: c.ink, backgroundColor: c.surfaceAlt }]}
          />
        ) : (
          <Txt variant="footnote" tone="secondary">
            That’s the most tags one look can have.
          </Txt>
        )}
        {suggestions.length && tags.length < MAX_TAGS ? (
          <View style={styles.chips}>
            {suggestions.map((t) => (
              <Chip key={t} label={`+ ${t}`} onPress={() => addTag(t)} />
            ))}
          </View>
        ) : null}
      </View>

      <View style={[styles.section, { marginBottom: space.xxl }]}>
        <ToggleRow label="Pin to You and your beauty" body="Keep it at the top of Home." value={pin} onChange={setPin} />
      </View>
    </Screen>
  );

  function skip() {
    useLibrary.getState().update(id!, { filed: true });
    track('library_file_skipped', {});
    done();
  }
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.l, marginTop: space.l },
  thumb: { width: 72, height: 96, borderRadius: radius.thumb },
  section: { gap: space.m, marginTop: space.x3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  input: { borderRadius: radius.chip, paddingHorizontal: space.l, minHeight: 48, fontFamily: fonts.sans, fontSize: 17 },
});
