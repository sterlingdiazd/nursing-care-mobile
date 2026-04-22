import type {
  CompleteNurseProfileRequest,
  CreateAdminCareRequestDto,
  CreateNurseProfileRequest,
} from "@/src/services/adminPortalService";

interface StatusChip {
  label: string;
  tone: "neutral" | "warning" | "success";
  helper: string;
}

interface ChecklistItem {
  key: string;
  label: string;
  complete: boolean;
}

export interface AdminCareCreateProgress {
  coreReady: boolean;
  missingCoreLabels: string[];
  completedCoreCount: number;
  totalCoreCount: number;
  status: StatusChip;
  checklist: ChecklistItem[];
}

export interface AdminNurseProgress {
  ready: boolean;
  missingLabels: string[];
  requiredCompletedCount: number;
  requiredTotalCount: number;
  status: StatusChip;
}

function buildStatus(label: string, tone: StatusChip["tone"], helper: string): StatusChip {
  return { label, tone, helper };
}

function isFilled(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function getAdminCareCreateProgress(form: CreateAdminCareRequestDto): AdminCareCreateProgress {
  const checklist: ChecklistItem[] = [
    { key: "client", label: "Cliente", complete: isFilled(form.clientUserId) },
    { key: "date", label: "Fecha", complete: isFilled(form.careRequestDate) },
    { key: "type", label: "Tipo", complete: isFilled(form.careRequestType) },
    { key: "unit", label: "Unidades", complete: Boolean(form.unit && form.unit > 0) },
    { key: "description", label: "Descripcion", complete: isFilled(form.careRequestDescription) },
  ];

  const missingCoreLabels = checklist.filter((item) => !item.complete).map((item) => item.label);
  const completedCoreCount = checklist.filter((item) => item.complete).length;
  const coreReady = missingCoreLabels.length === 0;

  return {
    coreReady,
    missingCoreLabels,
    completedCoreCount,
    totalCoreCount: checklist.length,
    status: coreReady
      ? buildStatus("Lista para revisar", "success", "La solicitud ya puede revisarse y enviarse.")
      : buildStatus(
          `Completa ${completedCoreCount} de ${checklist.length} campos clave`,
          "warning",
          `Faltan: ${missingCoreLabels.join(", ")}.`,
        ),
    checklist,
  };
}

export function getAdminNurseReviewProgress(form: CompleteNurseProfileRequest): AdminNurseProgress {
  const requiredFields = [
    ["specialty", "Especialidad", isFilled(form.specialty)],
    ["licenseId", "Licencia", isFilled(form.licenseId ?? undefined)],
    ["bankName", "Banco", isFilled(form.bankName)],
    ["accountNumber", "Cuenta", isFilled(form.accountNumber ?? undefined)],
    ["category", "Categoria", isFilled(form.category)],
  ] as const;

  const missingLabels = requiredFields.filter(([, , complete]) => !complete).map(([, label]) => label);
  const ready = missingLabels.length === 0;

  return {
    ready,
    missingLabels,
    requiredCompletedCount: requiredFields.length - missingLabels.length,
    requiredTotalCount: requiredFields.length,
    status: ready
      ? buildStatus("Lista para activar", "success", "La enfermera puede quedar lista para asignaciones.")
      : buildStatus(
          `Faltan ${missingLabels.length} campos`,
          "warning",
          `Completa: ${missingLabels.join(", ")}.`,
        ),
  };
}

export function getAdminNurseCreateProgress(form: CreateNurseProfileRequest): AdminNurseProgress {
  const requiredChecks = [
    ["name", "Nombre", isFilled(form.name)],
    ["lastName", "Apellido", isFilled(form.lastName)],
    ["identificationNumber", "Cedula", isFilled(form.identificationNumber)],
    ["phone", "Telefono", isFilled(form.phone)],
    ["email", "Correo", isFilled(form.email) && form.email.includes("@")],
    ["password", "Contrasena", isFilled(form.password) && form.password.length >= 8],
    ["confirmPassword", "Confirmacion", isFilled(form.confirmPassword) && form.confirmPassword === form.password],
    ["hireDate", "Fecha de contratacion", isFilled(form.hireDate)],
    ["specialty", "Especialidad", isFilled(form.specialty)],
    ["category", "Categoria", isFilled(form.category)],
  ] as const;

  const missingLabels = requiredChecks.filter(([, , complete]) => !complete).map(([, label]) => label);
  const ready = missingLabels.length === 0;

  return {
    ready,
    missingLabels,
    requiredCompletedCount: requiredChecks.length - missingLabels.length,
    requiredTotalCount: requiredChecks.length,
    status: ready
      ? buildStatus("Registro listo", "success", "La informacion requerida ya permite crear el perfil.")
      : buildStatus(
          `Faltan ${missingLabels.length} validaciones`,
          "warning",
          `Completa: ${missingLabels.slice(0, 4).join(", ")}${missingLabels.length > 4 ? "..." : ""}.`,
        ),
  };
}
