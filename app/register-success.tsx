import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Asset } from "expo-asset";
import * as Sharing from "expo-sharing";
import { IconBadge } from "@/src/components/shared/IconBadge";
import { FormButton } from "@/src/components/form";
import { designTokens } from "@/src/design-system/tokens";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import { hapticFeedback } from "@/src/utils/haptics";

const T = designTokens;

type StepStatus = "done" | "active" | "pending";

function StepRow({
  status,
  label,
  sublabel,
  isLast = false,
}: {
  status: StepStatus;
  label: string;
  sublabel?: string;
  isLast?: boolean;
}) {
  const iconName =
    status === "done" ? "check-circle" : status === "active" ? "clock-o" : "circle-o";
  const iconColor =
    status === "done"
      ? T.color.palette.green.color
      : status === "active"
        ? T.color.palette.amber.color
        : T.color.ink.muted;
  const badgeLabel =
    status === "done" ? "Completado" : status === "active" ? "En proceso" : "Pendiente";
  const badgeBg =
    status === "done"
      ? T.color.palette.green.soft
      : status === "active"
        ? T.color.palette.amber.soft
        : T.color.surface.secondary;
  const badgeText =
    status === "done"
      ? T.color.palette.green.text
      : status === "active"
        ? T.color.palette.amber.text
        : T.color.ink.muted;

  return (
    <View style={styles.stepWrapper}>
      <View style={styles.stepRow}>
        <View style={styles.stepIconCol}>
          <FontAwesome name={iconName} size={22} color={iconColor} />
          {!isLast && <View style={styles.stepConnector} />}
        </View>
        <View style={styles.stepContent}>
          <View style={styles.stepLabelRow}>
            <Text style={[styles.stepLabel, status === "pending" && styles.stepLabelMuted]}>
              {label}
            </Text>
            <View style={[styles.badge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.badgeText, { color: badgeText }]}>{badgeLabel}</Text>
            </View>
          </View>
          {sublabel ? (
            <Text style={styles.stepSublabel}>{sublabel}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function RegisterSuccessScreen() {
  const router = useRouter();
  const [isLoadingManual, setIsLoadingManual] = useState(false);

  const handleGoToPanel = () => {
    hapticFeedback.selection();
    router.replace("/");
  };

  const handleManual = async () => {
    hapticFeedback.selection();
    setIsLoadingManual(true);
    try {
      const asset = Asset.fromModule(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("../assets/manual-enfermera.pdf") as number,
      );
      await asset.downloadAsync();
      if (!asset.localUri) throw new Error("No local URI");
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(asset.localUri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: "Manual de la Enfermera",
        });
      } else {
        Alert.alert(
          "No disponible",
          "Tu dispositivo no puede abrir archivos PDF en este momento.",
        );
      }
    } catch {
      Alert.alert("Error", "No fue posible abrir el manual. Inténtalo de nuevo.");
    } finally {
      setIsLoadingManual(false);
    }
  };

  return (
    <SafeAreaView testID="register-success-screen" style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroArea}>
          <IconBadge icon="check-circle" hue="green" size={72} iconSize={36} />
          <Text style={styles.heroTitle}>¡Registro Exitoso!</Text>
          <Text style={styles.heroSubtitle}>
            Tu cuenta fue creada y está en revisión administrativa.
          </Text>
        </View>

        {/* Process card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>¿Qué sigue ahora?</Text>

          <StepRow
            status="done"
            label="Registro completado"
            sublabel="Tus datos fueron recibidos correctamente."
          />
          <StepRow
            status="active"
            label="Revisión del perfil"
            sublabel="El administrador validará tu información."
          />
          <StepRow
            status="pending"
            label="Cuenta activada"
            sublabel="Podrás recibir solicitudes de servicio."
            isLast
          />

          <View style={styles.divider} />

          <Text style={styles.infoText}>
            Recibirás una notificación en cuanto tu cuenta sea activada. Si tienes preguntas,
            comunícate con el administrador.
          </Text>
        </View>

        {/* Manual card */}
        <View style={styles.manualCard}>
          <View style={styles.manualLeft}>
            <IconBadge icon="book" hue="blue" size={42} iconSize={20} />
            <View style={styles.manualTextBlock}>
              <Text style={styles.manualTitle}>Manual de la Enfermera</Text>
              <Text style={styles.manualSub}>Guía de uso y procedimientos</Text>
            </View>
          </View>
          <View style={styles.pdfBadge}>
            <Text style={styles.pdfBadgeText}>PDF</Text>
          </View>
        </View>

        <FormButton
          testID="register-success-go-to-panel"
          onPress={handleGoToPanel}
          style={styles.ctaButton}
        >
          Entendido, ir al panel
        </FormButton>

        <FormButton
          testID="register-success-manual-button"
          variant="secondary"
          onPress={() => { void handleManual(); }}
          isLoading={isLoadingManual}
          style={styles.manualButton}
        >
          Abrir manual de la enfermera
        </FormButton>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.color.surface.canvas,
  },
  scrollContent: {
    padding: T.spacing.xl,
    paddingBottom: T.spacing.xxl,
  },
  heroArea: {
    alignItems: "center",
    paddingTop: T.spacing.xxl,
    paddingBottom: T.spacing.xl,
    gap: T.spacing.lg,
  },
  heroTitle: {
    ...T.typography.title,
    color: T.color.ink.primary,
    textAlign: "center",
  },
  heroSubtitle: {
    ...T.typography.body,
    color: T.color.ink.secondary,
    textAlign: "center",
  },
  card: {
    ...mobileSurfaceCard,
    padding: T.spacing.xl,
    marginBottom: T.spacing.lg,
  },
  cardTitle: {
    ...T.typography.sectionTitle,
    color: T.color.ink.primary,
    marginBottom: T.spacing.xl,
  },
  stepWrapper: {
    marginBottom: 0,
  },
  stepRow: {
    flexDirection: "row",
    gap: T.spacing.md,
  },
  stepIconCol: {
    alignItems: "center",
    width: 24,
  },
  stepConnector: {
    width: 2,
    flex: 1,
    minHeight: T.spacing.lg,
    backgroundColor: T.color.border.subtle,
    marginVertical: T.spacing.xs,
  },
  stepContent: {
    flex: 1,
    paddingBottom: T.spacing.lg,
  },
  stepLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: T.spacing.sm,
    marginBottom: T.spacing.xs,
  },
  stepLabel: {
    ...T.typography.bodyStrong,
    color: T.color.ink.primary,
    flex: 1,
  },
  stepLabelMuted: {
    color: T.color.ink.muted,
  },
  stepSublabel: {
    ...T.typography.caption,
    color: T.color.ink.secondary,
  },
  badge: {
    borderRadius: T.radius.pill,
    paddingHorizontal: T.spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    ...T.typography.caption,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: T.color.border.subtle,
    marginVertical: T.spacing.lg,
  },
  infoText: {
    ...T.typography.body,
    color: T.color.ink.secondary,
  },
  manualCard: {
    ...mobileSurfaceCard,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: T.spacing.lg,
    marginBottom: T.spacing.xl,
  },
  manualLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.spacing.md,
    flex: 1,
  },
  manualTextBlock: {
    flex: 1,
  },
  manualTitle: {
    ...T.typography.bodyStrong,
    color: T.color.ink.primary,
  },
  manualSub: {
    ...T.typography.caption,
    color: T.color.ink.secondary,
  },
  pdfBadge: {
    backgroundColor: T.color.palette.red.soft,
    borderRadius: T.radius.pill,
    paddingHorizontal: T.spacing.md,
    paddingVertical: T.spacing.xs,
  },
  pdfBadgeText: {
    ...T.typography.caption,
    color: T.color.palette.red.text,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  ctaButton: {
    marginBottom: T.spacing.md,
  },
  manualButton: {
    marginBottom: 0,
  },
});
