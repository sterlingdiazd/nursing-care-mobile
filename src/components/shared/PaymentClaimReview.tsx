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
  container: { marginBottom: 16 },
  loader: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: designTokens.color.ink.secondary,
    marginBottom: 8,
  },
  row: { fontSize: 14, color: designTokens.color.ink.primary, marginBottom: 2 },
  ocrBox: {
    borderWidth: 1,
    borderColor: designTokens.color.border.accent,
    backgroundColor: designTokens.color.surface.accent,
    borderRadius: designTokens.radius.md,
    padding: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  ocrLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: designTokens.color.ink.accentStrong,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  ocrMeta: { fontSize: 12, color: designTokens.color.ink.secondary, fontWeight: "700", marginTop: 4 },
  warning: { fontSize: 13, fontWeight: "700", color: "#8a5a00", marginTop: 8 },
  danger: { fontSize: 13, fontWeight: "700", color: "#8b1a1a", marginTop: 8 },
  hint: { fontSize: 12, color: designTokens.color.ink.muted, marginTop: 10 },
});
