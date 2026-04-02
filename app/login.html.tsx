import { useEffect } from "react";
import { Platform } from "react-native";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

function toSearchParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default function LoginHtmlRedirectScreen() {
  const params = useLocalSearchParams();
  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const search = window.location.search || "";
      const hash = window.location.hash || "";
      window.location.replace(`/login${search}${hash}`);
      return;
    }

    const redirectParams: Record<string, string> = {};

    Object.entries(params).forEach(([key, value]) => {
      const normalizedValue = toSearchParamValue(value);

      if (typeof normalizedValue === "string" && normalizedValue.length > 0) {
        redirectParams[key] = normalizedValue;
      }
    });

    router.replace({
      pathname: "/login",
      params: redirectParams,
    });
  }, [params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
