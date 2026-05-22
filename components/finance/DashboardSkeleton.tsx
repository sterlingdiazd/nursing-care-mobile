import { StyleSheet, View } from "react-native";
import { financeTheme as t } from "./financeTheme";

function Block({ height, width = "100%", radius = t.radiusSm }: { height: number; width?: any; radius?: number }) {
  return <View style={[styles.block, { height, width, borderRadius: radius }]} />;
}

/** Static placeholder layout shown while the dashboard loads (perceived performance). */
export function DashboardSkeleton() {
  return (
    <View style={styles.wrap}>
      <Block height={150} radius={t.radius} />
      <View style={styles.row}>
        <Block height={86} width="31%" />
        <Block height={86} width="31%" />
        <Block height={86} width="31%" />
      </View>
      <Block height={74} />
      <Block height={74} />
      <Block height={180} radius={t.radius} />
      <Block height={160} radius={t.radius} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  row: { flexDirection: "row", gap: 10, justifyContent: "space-between" },
  block: { backgroundColor: t.card, opacity: 0.6 },
});
