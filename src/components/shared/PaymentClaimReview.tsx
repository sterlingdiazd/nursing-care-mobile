import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { getPaymentClaim, type PaymentClaimReview as PaymentClaimReviewData } from "@/src/services/adminPortalService";
import { designTokens } from "@/src/design-system/tokens";

const money = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function parseOcrWarnings(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Anti-fraud review: the structured payment claim the client reported (bank reference, amount, date,
 * paying bank) plus flags for an amount that does not match the invoice and a bank reference already
 * used on another request. The uploaded image is only a CLAIM — the admin must verify the deposit in
 * the bank before confirming.
 */
export default function PaymentClaimReview({ careRequestId }: { careRequestId: string }) {
  const [claim, setClaim] = useState<PaymentClaimReviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getPaymentClaim(careRequestId)
      .then((value) => {
        if (active) setClaim(value);
      })
      .catch(() => {
        if (active) setClaim(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [careRequestId]);

  if (loading) {
    return <ActivityIndicator color={designTokens.color.ink.accentStrong} style={styles.loader} />;
  }
  if (!claim || !claim.hasProof) {
    return null;
  }

  return (
    <View style={styles.container} testID="payment-claim-review" nativeID="payment-claim-review">
      <Text style={styles.label}>Datos del pago reportado</Text>
      {claim.claimedBankReference ? (
        <Text style={styles.row}>Referencia: {claim.claimedBankReference}</Text>
      ) : null}
      {claim.claimedAmount != null ? (
        <Text style={styles.row}>Monto reportado: {money(claim.claimedAmount)}</Text>
      ) : null}
      {claim.claimedPaymentDate ? <Text style={styles.row}>Fecha: {claim.claimedPaymentDate}</Text> : null}
      {claim.payingBank ? <Text style={styles.row}>Banco: {claim.payingBank}</Text> : null}

      {claim.ocrDraftSentence ? (
        <View style={styles.ocrBox} testID="admin-payment-ocr-draft" nativeID="admin-payment-ocr-draft">
          <Text style={styles.ocrLabel}>Borrador OCR</Text>
          <Text style={styles.row}>{claim.ocrDraftSentence}</Text>
          {claim.ocrConfidence != null ? (
            <Text style={styles.ocrMeta}>Confianza: {Math.round(claim.ocrConfidence * 100)}%</Text>
          ) : null}
          {claim.ocrClientEdited ? (
            <Text style={styles.warning}>El cliente editó datos después de la lectura automática.</Text>
          ) : null}
          {parseOcrWarnings(claim.ocrWarningsJson).map((warning, index) => (
            <Text key={`${warning}-${index}`} style={styles.warning}>• {warning}</Text>
          ))}
        </View>
      ) : null}

      {claim.amountReported && !claim.amountMatches ? (
        <Text style={styles.warning} testID="claim-amount-mismatch">
          El monto reportado no coincide con la factura ({money(claim.invoiceTotal)}).
        </Text>
      ) : null}
      {claim.reusedReference ? (
        <Text style={styles.danger} testID="claim-reused-reference">
          Esta referencia bancaria ya fue usada en otro pago. Verifica que no sea la misma transferencia.
        </Text>
      ) : null}

      <Text style={styles.hint}>
        El comprobante y el OCR son solo una declaración. Verifica el ingreso en tu banco antes de confirmar.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: designTokens.spacing.lg },
  loader: { marginBottom: designTokens.spacing.lg },
  label: {
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.secondary,
    marginBottom: designTokens.spacing.sm,
  },
  row: { fontSize: designTokens.typography.body.fontSize, color: designTokens.color.ink.primary, marginBottom: designTokens.spacing.xs },
  ocrBox: {
    borderWidth: 1,
    borderColor: designTokens.color.border.accent,
    backgroundColor: designTokens.color.surface.accent,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
    marginTop: designTokens.spacing.md,
    marginBottom: designTokens.spacing.xs,
  },
  ocrLabel: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "800",
    color: designTokens.color.ink.accentStrong,
    marginBottom: designTokens.spacing.xs,
    textTransform: "uppercase",
  },
  ocrMeta: { fontSize: designTokens.typography.caption.fontSize, color: designTokens.color.ink.secondary, fontWeight: "700", marginTop: designTokens.spacing.xs },
  warning: { fontSize: designTokens.typography.label.fontSize, fontWeight: "700", color: designTokens.color.status.warningText, marginTop: designTokens.spacing.sm },
  danger: { fontSize: designTokens.typography.label.fontSize, fontWeight: "700", color: designTokens.color.status.dangerText, marginTop: designTokens.spacing.sm },
  hint: { fontSize: designTokens.typography.caption.fontSize, color: designTokens.color.ink.muted, marginTop: designTokens.spacing.md },
});
