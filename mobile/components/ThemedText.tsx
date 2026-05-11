import React from 'react';
import { Text, TextProps } from 'react-native';

import { Colors, Typography } from '@/constants/theme';

type Variant = keyof typeof Typography;

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
}

export function ThemedText({ variant = 'body', color, style, ...props }: Props) {
  return (
    <Text
      style={[Typography[variant], { color: color ?? Colors.black }, style]}
      {...props}
    />
  );
}
