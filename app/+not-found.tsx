import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { designTokens } from '@/src/design-system/tokens';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: designTokens.spacing.xl,
  },
  title: {
    fontSize: designTokens.typography.section.fontSize,
    fontWeight: 'bold',
  },
  link: {
    marginTop: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.lg,
  },
  linkText: {
    fontSize: designTokens.typography.body.fontSize,
    color: designTokens.color.ink.accent,
  },
});
