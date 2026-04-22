import AdminCareRequestBillingTaskScreen from "@/src/components/shared/AdminCareRequestBillingTaskScreen";
import { generateReceipt } from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";

export default function AdminCareRequestReceiptScreen() {
  return (
    <AdminCareRequestBillingTaskScreen
      action="receipt"
      eyebrow="Comprobante administrativo"
      title="Generar recibo"
      description="Finaliza el flujo de cobro generando el recibo correspondiente para la solicitud pagada."
      submitLabel="Generar recibo"
      submitLoadingLabel="Generando..."
      successMessage="Recibo generado correctamente."
      allowedStatuses={["Paid"]}
      screenTestID={adminTestIds.careRequests.billingRoutes.receiptScreen}
      submitTestID={adminTestIds.careRequests.billingRoutes.receiptSubmitButton}
      execute={(id) => generateReceipt(id).then(() => undefined)}
    />
  );
}
