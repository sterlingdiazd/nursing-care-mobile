import { Redirect, useLocalSearchParams } from "expo-router";

function toSearchParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default function LoginHtmlRedirectScreen() {
  const params = useLocalSearchParams();
  const redirectParams: Record<string, string> = {};

  Object.entries(params).forEach(([key, value]) => {
    const normalizedValue = toSearchParamValue(value);

    if (typeof normalizedValue === "string" && normalizedValue.length > 0) {
      redirectParams[key] = normalizedValue;
    }
  });

  return <Redirect href={{ pathname: "/login", params: redirectParams }} />;
}
