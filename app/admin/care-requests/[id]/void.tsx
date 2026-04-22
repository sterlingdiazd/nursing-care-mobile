import AdminCareRequestBillingTaskScreen from "@/src/components/shared/AdminCareRequestBillingTaskScreen";
import { voidCareRequest } from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";

export default function AdminCareRequestVoidScreen() {
  return (
    <AdminCareRequestBillingTaskScreen
      action="void"
      eyebrow="Control administrativo"
      title="Anular flujo de cobro"
      description="Documenta el motivo de anulación para mantener la trazabilidad del proceso de facturación."
      submitLabel="Confirmar anulación"
      submitLoadingLabel="Anulando..."
      successMessage="Solicitud anulada correctamente."
      validationMessage="El motivo de anulación es obligatorio."
      allowedStatuses={["Invoiced", "Paid"]}
      screenTestID={adminTestIds.careRequests.billingRoutes.voidScreen}
      inputTestID={adminTestIds.careRequests.billingRoutes.voidInput}
      submitTestID={adminTestIds.careRequests.billingRoutes.voidSubmitButton}
      inputLabel="Motivo de anulación"
      inputPlaceholder="Describe el motivo"
      inputMultiline
      execute={(id, inputValue) => voidCareRequest(id, inputValue).then(() => undefined)}
    />
  );
}
