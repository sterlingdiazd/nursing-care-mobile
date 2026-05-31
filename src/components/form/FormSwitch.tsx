import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Platform,
} from "react-native";
import { designTokens } from "@/src/design-system/tokens";
import { testProps } from "@/src/testing/testIds";

interface FormSwitchProps {
  testID: string;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  description?: string;
  containerStyle?: any;
}

export function FormSwitch({
  testID,
  label,
  value,
  onValueChange,
  description,
  containerStyle,
}: FormSwitchProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.row}>
        <View style={styles.textContainer}>
          <Text style={styles.label}>{label}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
        <Switch
          {...testProps(testID)}
          value={value}
          onValueChange={onValueChange}
          trackColor={{ 
            false: designTokens.color.border.strong, 
            true: designTokens.color.ink.accent 
          }}
          thumbColor={Platform.OS === "ios" ? undefined : designTokens.color.surface.primary}
          ios_backgroundColor={designTokens.color.border.strong}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: designTokens.spacing.lg,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    paddingRight: designTokens.spacing.md,
  },
  label: {
    ...designTokens.typography.label,
    color: designTokens.color.ink.primary,
  },
  description: {
    ...designTokens.typography.body,
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.color.ink.secondary,
    marginTop: designTokens.spacing.xs,
  },
});
