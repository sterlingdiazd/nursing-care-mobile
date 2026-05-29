import { useState } from "react";
import AdminCareRequestBillingTaskScreen from "@/src/components/shared/AdminCareRequestBillingTaskScreen";
import PaymentProofPreview from "@/src/components/shared/PaymentProofPreview";
import PaymentClaimReview from "@/src/components/shared/PaymentClaimReview";
import { payCareRequest, type PayCareRequestMetadata } from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";

export default function AdminCareRequestPayScreen() {
  const [bankReference, setBankReference] = useState("");

  return (
    <AdminCareRequestBillingTaskScreen
      action="pay"
      eyebrow="Cobro administrativo"
      title="Verificar pago"
      description="Revisa el comprobante y el borrador OCR. Confirma solo después de verificar el ingreso en el banco."
      submitLabel="Confirmar pago recibido"
      submitLoadingLabel="Confirmando..."
      successMessage="Pago confirmado correctamente."
      validationMessage="La referencia bancaria es obligatoria."
      allowedStatuses={["Invoiced", "PaymentReported"]}
      screenTestID={adminTestIds.careRequests.billingRoutes.payScreen}
      inputTestID={adminTestIds.careRequests.billingRoutes.payInput}
      submitTestID={adminTestIds.careRequests.billingRoutes.paySubmitButton}
      inputLabel="Referencia bancaria"
      inputPlaceholder="Ej. REF-849302"
      renderBeforeInput={(detail) =>
        detail.status === "PaymentReported" ? (
          <>
            <PaymentClaimReview careRequestId={detail.id} />
            <PaymentProofPreview careRequestId={detail.id} />
          </>
        ) : null
      }
      execute={async (id, inputValue) => {
        const metadata: PayCareRequestMetadata = { bankReference: inputValue };
        await payCareRequest(id, metadata);
      }}
    />
  );
}
