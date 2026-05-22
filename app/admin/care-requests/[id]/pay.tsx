import AdminCareRequestBillingTaskScreen from "@/src/components/shared/AdminCareRequestBillingTaskScreen";
import PaymentProofPreview from "@/src/components/shared/PaymentProofPreview";
import { payCareRequest } from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";

export default function AdminCareRequestPayScreen() {
  return (
    <AdminCareRequestBillingTaskScreen
      action="pay"
      eyebrow="Cobro administrativo"
      title="Confirmar pago recibido"
      description="Revisa el comprobante enviado por el cliente, verifica el dinero en el banco y captura la referencia bancaria para confirmar la recepción del pago."
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
        detail.status === "PaymentReported" ? <PaymentProofPreview careRequestId={detail.id} /> : null
      }
      execute={(id, inputValue) => payCareRequest(id, inputValue).then(() => undefined)}
    />
  );
}
