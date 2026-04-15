import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { getAdminActionItems, type AdminActionItemDto } from "@/src/services/adminPortalService";

function resolveMobileDeepLink(path: string) {
  if (path.includes("/admin/care-requests") && path.includes("selected=")) {
    const id = path.split("selected=")[1]?.split("&")[0];
    return id ? `/care-requests/${id}` : "/care-requests";
  }
  if (path.startsWith("/admin/care-requests/")) {
    const id = path.replace("/admin/care-requests/", "").split("?")[0];
    return `/care-requests/${id}`;
  }
  if (path.startsWith("/admin/care-requests")) {
    return "/care-requests";
  }
  return "/admin";
}

export default function AdminActionItemsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [items, setItems] = useState<AdminActionItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!roles.includes("ADMIN")) return void router.replace("/");

    void getAdminActionItems()
      .then(setItems)
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "No fue posible cargar acciones."));
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  const unreadCount = useMemo(() => items.filter((item) => item.state === "Unread").length, [items]);

  return (
    <MobileWorkspaceShell
      eyebrow="Cola administrativa"
      title="Acciones pendientes"
      description="Elementos que requieren seguimiento administrativo."
      actions={<Pressable style={styles.button} onPress={() => router.push("/admin")}><Text style={styles.buttonText}>Volver al panel</Text></Pressable>}
    >
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>No leidas</Text>
        <Text style={styles.summaryValue}>{unreadCount}</Text>
      </View>
      <View style={styles.list}>
        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.badge}>{item.severity} · {item.state}</Text>
            <Text style={styles.title}>{item.summary}</Text>
            <Text style={styles.body}>{item.requiredAction}</Text>
            <Pressable style={styles.link} onPress={() => router.push(resolveMobileDeepLink(item.deepLinkPath) as never)}>
              <Text style={styles.linkText}>Abrir entidad relacionada</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 18,
    padding: 16,
  },
  summaryLabel: { color: "#6b7280", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  summaryValue: { color: "#111827", fontWeight: "800", fontSize: 28 },
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  badge: { color: "#92400e", fontWeight: "800", marginBottom: 8, fontSize: 12, textTransform: "uppercase" },
  title: { color: "#111827", fontWeight: "800", fontSize: 17, marginBottom: 6 },
  body: { color: "#4b5563", marginBottom: 12, lineHeight: 20 },
  link: { alignSelf: "flex-start", backgroundColor: "#ffffff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#d1d5db" },
  linkText: { color: "#007aff", fontWeight: "700" },
  button: { backgroundColor: "#ffffff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: "#d1d5db" },
  buttonText: { color: "#007aff", fontWeight: "700" },
  error: { color: "#b91c1c", marginBottom: 12 },
});
