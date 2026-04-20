import { TextInput, TextInputProps } from "react-native";
import { testProps } from "@/src/testing/testIds";

interface FormInputProps extends Omit<TextInputProps, "testID"> {
  testID: string;
}

export function FormInput({ testID, ...props }: FormInputProps) {
  return <TextInput {...testProps(testID)} {...props} />;
}
