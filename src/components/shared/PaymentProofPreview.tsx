import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { getPaymentProofImageDataUri } from "@/src/services/careRequestService";
import { designTokens } from "@/src/design-system/tokens";

/** Loads and shows the client-uploaded payment-proof image so the admin can verify it before paying. */
export default function PaymentProofPreview({ careRequestId }: { careRequestId: string }) {
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getPaymentProofImageDataUri(careRequestId)
      .then((uri) => {
        if (active) setDataUri(uri);
      })
      .catch(() => {
        if (active) setError("No hay comprobante disponible.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [careRequestId]);

  return (
    <View style={styles.container} testID="payment-proof-preview" nativeID="payment-proof-preview">
      <Text style={styles.label}>Comprobante enviado por el cliente</Text>
      {loading ? <ActivityIndicator color={designTokens.color.ink.accentStrong} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {dataUri ? (
        <Image source={{ uri: dataUri }} style={styles.image} resizeMode="contain" testID="payment-proof-image" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: designTokens.spacing.lg },
  label: {
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.secondary,
    marginBottom: designTokens.spacing.sm,
  },
  image: {
    width: "100%",
    height: 260,
    borderRadius: designTokens.radius.md,
    backgroundColor: designTokens.color.surface.secondary,
  },
  error: { color: designTokens.color.ink.muted, fontSize: designTokens.typography.label.fontSize },
});
