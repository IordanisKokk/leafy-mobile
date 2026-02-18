import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { colors, radius, spacing } from "../theme";

type Props = {
  label?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  inputStyle?: StyleProp<TextStyle>;
} & TextInputProps;

const FormField: React.FC<Props> = ({
  label,
  helperText,
  containerStyle,
  labelStyle,
  inputStyle,
  style,
  placeholderTextColor,
  ...inputProps
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}
      <TextInput
        {...inputProps}
        style={[styles.input, inputStyle, style]}
        placeholderTextColor={placeholderTextColor ?? "#64748b"}
      />
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  input: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 14,
    fontWeight: "600",
  },
  helperText: {
    marginTop: spacing.xs,
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },
});

export default FormField;
