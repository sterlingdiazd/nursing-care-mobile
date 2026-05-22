import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { financeTheme as t } from "./financeTheme";

export interface DrilldownRow {
  label: string;
  value: string;
  emphasize?: boolean;
}

export interface DrilldownContent {
  title: string;
  explanation?: string;
  rows?: DrilldownRow[];
  bullets?: string[];
}

export function DrilldownSheet({
  visible,
  content,
  onClose,
}: {
  visible: boolean;
  content: DrilldownContent | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{content?.title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Text style={styles.close}>Cerrar</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {content?.explanation ? <Text style={styles.explain}>{content.explanation}</Text> : null}
            {content?.rows?.length ? (
              <View style={styles.rows}>
                {content.rows.map((r, i) => (
                  <View key={i} style={styles.row}>
                    <Text style={styles.rowLabel} numberOfLines={1}>{r.label}</Text>
                    <Text style={[styles.rowValue, r.emphasize ? { color: t.accent } : null]}>{r.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {content?.bullets?.length ? (
              <View style={styles.bullets}>
                <Text style={styles.bulletsTitle}>¿Por qué?</Text>
                {content.bullets.map((b, i) => (
                  <Text key={i} style={styles.bullet}>•  {b}</Text>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: t.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 10,
    maxHeight: "82%",
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 999, backgroundColor: t.cardBorder, marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { color: t.text, fontSize: 18, fontWeight: "800", flex: 1 },
  close: { color: t.accent, fontSize: 15, fontWeight: "700" },
  explain: { color: t.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 14 },
  rows: { gap: 2, marginBottom: 14 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: t.cardBorder,
    gap: 12,
  },
  rowLabel: { color: t.textMuted, fontSize: 13, flex: 1 },
  rowValue: { color: t.text, fontSize: 14, fontWeight: "700" },
  bullets: { gap: 7, marginTop: 4 },
  bulletsTitle: { color: t.text, fontSize: 13, fontWeight: "800", marginBottom: 2 },
  bullet: { color: t.textMuted, fontSize: 13, lineHeight: 19 },
});
