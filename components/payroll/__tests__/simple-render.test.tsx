import React from 'react';
import { describe, it, expect } from 'vitest';
import renderer from 'react-test-renderer';
import { View, Text } from 'react-native';

describe('Simple React Native', () => {
  it('renders View with Text', () => {
    const component = renderer.create(
      <View>
        <Text>Hello World</Text>
      </View>
    );
    expect(component).toBeTruthy();
  });
});