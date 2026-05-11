import React from 'react';
import { View, ViewProps } from 'react-native';

import { Colors } from '@/constants/theme';

interface Props extends ViewProps {
  background?: string;
}

export function ThemedView({ background, style, ...props }: Props) {
  return (
    <View style={[{ backgroundColor: background ?? Colors.white }, style]} {...props} />
  );
}
