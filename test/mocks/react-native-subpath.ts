import React from "react";

const createMockComponent = (name = "MockNativeComponent") => {
  const component = (props: any) => React.createElement(name, props, props.children);
  component.displayName = name;
  return component;
};

const exportedFunction = ((name?: string) => createMockComponent(name)) as any;

export default exportedFunction;
export const __esModule = true;
