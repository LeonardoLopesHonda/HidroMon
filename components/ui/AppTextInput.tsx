import React, { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/constants/theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  variant?: 'underline' | 'outlined';
}

export const AppTextInput = forwardRef<TextInput, Props>(
  ({ label, error, variant = 'outlined', style, ...props }, ref) => {
    const hasError = !!error;

    return (
      <View style={styles.wrapper}>
        <Text style={[Typography.caption, styles.label, hasError && { color: Colors.danger }]}>
          {label.toUpperCase()}
        </Text>
        <TextInput
          ref={ref}
          placeholderTextColor={Colors.gray400}
          style={[
            Typography.body,
            styles.input,
            variant === 'underline' ? styles.underline : styles.outlined,
            hasError && (variant === 'underline' ? styles.underlineError : styles.outlinedError),
            style,
          ]}
          {...props}
        />
        {hasError && (
          <Text style={[Typography.caption, { color: Colors.danger, marginTop: Spacing.xs }]}>
            {error}
          </Text>
        )}
      </View>
    );
  }
);

AppTextInput.displayName = 'AppTextInput';

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  label: {
    color: Colors.gray500,
    marginBottom: Spacing.xs,
    letterSpacing: 0.8,
  },
  input: {
    color: Colors.black,
    paddingVertical: Spacing.sm + 2,
  },
  underline: {
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.gray300,
    paddingHorizontal: 0,
  },
  outlined: {
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
  },
  underlineError: {
    borderBottomColor: Colors.danger,
  },
  outlinedError: {
    borderColor: Colors.danger,
  },
});
