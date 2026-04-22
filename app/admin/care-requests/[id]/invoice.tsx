import AdminCareRequestBillingTaskScreen from "@/src/components/shared/AdminCareRequestBillingTaskScreen";
import { invoiceCareRequest } from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";

export default function AdminCareRequestInvoiceScreen() {
  return (
    <AdminCareRequestBillingTaskScreen
      action="invoice"
      eyebrow="Facturación administrativa"
      title="Emitir factura"
      description="Convierte la solicitud completada en una tarea de facturación con un número de factura trazable."
      submitLabel="Confirmar factura"
      submitLoadingLabel="Facturando..."
      successMessage="Solicitud facturada correctamente."
      validationMessage="El número de factura es obligatorio."
      allowedStatuses={["Completed"]}
      screenTestID={adminTestIds.careRequests.billingRoutes.invoiceScreen}
      inputTestID={adminTestIds.careRequests.billingRoutes.invoiceInput}
      submitTestID={adminTestIds.careRequests.billingRoutes.invoiceSubmitButton}
      inputLabel="Número de factura"
      inputPlaceholder="Ej. FAC-2026-0012"
      execute={(id, inputValue) => invoiceCareRequest(id, inputValue).then(() => undefined)}
    />
  );
}
