import { StyleSheet, Text, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import { CATEGORY_META, type ServiceCategory } from "./serviceCategory";

const ORDER: ServiceCategory[] = ["hogar", "domicilio", "otros"];

/** Color key for the calendar dots: Hogar / Domicilio / Otros. */
export function CategoryLegend() {
  return (
    <View style={styles.row}>
      {ORDER.map((c) => (
        <View key={c} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: CATEGORY_META[c].color }]} />
          <Text style={styles.label}>{CATEGORY_META[c].label}</Text>
        </View>
      ))}
    </View>
  );
}

const T = designTokens;
const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.lg, paddingVertical: designTokens.spacing.xs },
  item: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.sm },
  dot: { width: 10, height: 10, borderRadius: designTokens.radius.sm },
  label: { color: T.color.ink.secondary, fontSize: designTokens.typography.caption.fontSize, fontWeight: "700" },
});
