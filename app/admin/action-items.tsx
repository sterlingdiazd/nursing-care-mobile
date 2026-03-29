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
      title="Acciones que requieren intervencion"
      description="Vista mobile de la cola prioritaria del portal administrativo web."
      actions={<Pressable style={styles.button} onPress={() => router.push("/admin")}><Text style={styles.buttonText}>Volver al panel</Text></Pressable>}
    >
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.meta}>No leidas: {unreadCount}</Text>
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
  card: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14 },
  badge: { color: "#7c2d12", fontWeight: "800", marginBottom: 8 },
  title: { color: "#102a43", fontWeight: "800", fontSize: 17, marginBottom: 6 },
  body: { color: "#52637a", marginBottom: 10 },
  link: { alignSelf: "flex-start", backgroundColor: "#e0e7ff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  linkText: { color: "#1e3a8a", fontWeight: "700" },
  button: { backgroundColor: "#fef3c7", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  buttonText: { color: "#132d75", fontWeight: "800" },
  error: { color: "#b91c1c", marginBottom: 12 },
  meta: { color: "#334155", marginBottom: 12, fontWeight: "700" },
});
