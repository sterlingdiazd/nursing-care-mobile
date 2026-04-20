import React from "react";
import { TouchableOpacity, TouchableOpacityProps } from "react-native";
import { testProps } from "@/src/testing/testIds";

interface FormButtonProps extends Omit<TouchableOpacityProps, "testID"> {
  testID: string;
  children: React.ReactNode;
}

export function FormButton({ testID, children, ...props }: FormButtonProps) {
  return (
    <TouchableOpacity {...testProps(testID)} {...props}>
      {children}
    </TouchableOpacity>
  );
}
