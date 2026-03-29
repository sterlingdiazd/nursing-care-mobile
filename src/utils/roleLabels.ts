const roleLabelMap: Record<string, string> = {
  ADMIN: "Administracion",
  CLIENT: "Cliente",
  NURSE: "Enfermeria",
};

export function formatRoleLabels(roles: string[], emptyLabel = "Sin roles cargados") {
  if (roles.length === 0) {
    return emptyLabel;
  }

  return roles
    .map((role) => roleLabelMap[role] ?? role)
    .join(", ");
}
