import AdminCareRequestBillingTaskScreen from "@/src/components/shared/AdminCareRequestBillingTaskScreen";
import { payCareRequest } from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";

export default function AdminCareRequestPayScreen() {
  return (
    <AdminCareRequestBillingTaskScreen
      action="pay"
      eyebrow="Cobro administrativo"
      title="Registrar pago"
      description="Captura la referencia bancaria del cobro para dejar constancia del pago recibido."
      submitLabel="Guardar pago"
      submitLoadingLabel="Registrando..."
      successMessage="Pago registrado correctamente."
      validationMessage="La referencia bancaria es obligatoria."
      allowedStatuses={["Invoiced"]}
      screenTestID={adminTestIds.careRequests.billingRoutes.payScreen}
      inputTestID={adminTestIds.careRequests.billingRoutes.payInput}
      submitTestID={adminTestIds.careRequests.billingRoutes.paySubmitButton}
      inputLabel="Referencia bancaria"
      inputPlaceholder="Ej. REF-849302"
      execute={(id, inputValue) => payCareRequest(id, inputValue).then(() => undefined)}
    />
  );
}
