import React from "react";

const createMockComponent = (name: string) => {
  const component = (props: any) => React.createElement(name, props, props.children);
  component.displayName = name;
  return component;
};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T) => styles,
};

export const View = createMockComponent("View");
export const Text = createMockComponent("Text");
export const TouchableOpacity = createMockComponent("TouchableOpacity");
export const Pressable = createMockComponent("Pressable");
export const ScrollView = createMockComponent("ScrollView");
export const RefreshControl = createMockComponent("RefreshControl");
export const FlatList = createMockComponent("FlatList");
export const SectionList = createMockComponent("SectionList");
export const StatusBar = createMockComponent("StatusBar");
export const TextInput = createMockComponent("TextInput");
export const ActivityIndicator = createMockComponent("ActivityIndicator");
export const Modal = createMockComponent("Modal");
export const KeyboardAvoidingView = createMockComponent("KeyboardAvoidingView");
export const Image = createMockComponent("Image");
export const SafeAreaView = createMockComponent("SafeAreaView");

export const Alert = {
  alert: () => undefined,
};

export const Platform = {
  OS: "ios",
  select: <T,>(options: { ios?: T; default?: T }) => options.ios ?? options.default,
};

export default {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  RefreshControl,
  FlatList,
  SectionList,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Image,
  SafeAreaView,
  Alert,
  Platform,
};
