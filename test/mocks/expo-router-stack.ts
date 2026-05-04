import React from "react";

const createMockComponent = (name: string) => {
  const component = (props: any) => React.createElement(name, props, props.children);
  component.displayName = name;
  return component;
};

const Stack = createMockComponent("Stack") as any;
Stack.Screen = createMockComponent("Stack.Screen");

export default Stack;
export { Stack };
