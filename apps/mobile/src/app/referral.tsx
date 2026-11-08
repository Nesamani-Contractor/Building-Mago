import { Share, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card, Hairline } from '@/components/Surface';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { useProfile } from '@/data/profile';
import { useAccount } from '@/data/account';
import { config } from '@/services/config';

/** M-50 Referral: reward = 1 month Pro each when a friend installs AND completes a first look. Cap 12/yr. */
export default function Referral() {
  const { c } = useTheme();
  const code = useProfile((s) => s.referralCode);
  const referrals = useAccount((s) => s.referrals);
  const earned = useAccount((s) => s.referralMonthsEarned);
  const [copied, setCopied] = useState(false);
  const link = `${config.referralBaseUrl}${code}`;

  return (
    <Screen
      mood="reveal"
      header={<TopBar title="Invite friends" />}
      footer={<Button label="Share my invite" icon="share" onPress={() => Share.share({ message: `I turn beauty tutorials into step-by-step looks with Mago. Try it: ${link}` })} />}
    >
      <View style={{ gap: space.m, marginTop: space.xxl }}>
        <Txt variant="title1">Give a month, get a month</Txt>
        <Txt variant="body" tone="secondary">
          When a friend installs Mago with your link and finishes her first look, you both get one month of Pro.
        </Txt>
      </View>
      <Card style={{ marginTop: space.xxl, gap: space.m }}>
        <Txt variant="footnote" tone="secondary">
          Your link
        </Txt>
        <Txt variant="headline" selectable>
          {link}
        </Txt>
        <Button
          variant="secondary"
          label={copied ? 'Copied' : 'Copy link'}
          icon={copied ? 'check' : 'link'}
          onPress={async () => {
            await Clipboard.setStringAsync(link);
            haptic.select();
            setCopied(true);
          }}
        />
      </Card>
      <Card style={{ marginTop: space.l, gap: space.m }}>
        <View style={styles.row}>
          <Icon name="gift" size={22} />
          <Txt variant="headline" style={{ flex: 1 }}>
            {earned} of 12 free months earned this year
          </Txt>
        </View>
        <Hairline />
        {referrals.length === 0 ? (
          <Txt variant="callout" tone="secondary">
            No invites yet. Friends show up here as they install, finish a look, and unlock your reward.
          </Txt>
        ) : (
          referrals.map((r) => (
            <View key={r.id} style={styles.row}>
              <Txt variant="body" style={{ flex: 1 }}>
                {r.label}
              </Txt>
              <Txt variant="footnote" tone="secondary">
                {r.status === 'installed' ? 'Installed' : r.status === 'activated' ? 'Finished a look' : 'Reward unlocked'}
              </Txt>
            </View>
          ))
        )}
      </Card>
      <Txt variant="footnote" tone="secondary" style={{ marginTop: space.l, color: c.inkSecondary }}>
        Rewards count real installs and first looks, not shares.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m },
});
