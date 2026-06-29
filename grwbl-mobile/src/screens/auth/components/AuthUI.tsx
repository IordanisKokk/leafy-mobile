import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { boxShadows, colors, radius, spacing } from "../../../theme";

type AuthHeroCardProps = {
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const AuthHeroCard: React.FC<AuthHeroCardProps> = ({ title, body, icon }) => {
  return (
    <LinearGradient
      colors={["#eaf7e6", "#d9ecd5"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      <View style={styles.heroBlobLarge} />
      <View style={styles.heroBlobSmall} />

      <View style={styles.heroTextWrap}>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroBody}>{body}</Text>
      </View>

      <View style={styles.heroArtWrap}>
        <Ionicons name={icon} size={46} color={"rgba(14,149,63,0.5)"} />
      </View>
    </LinearGradient>
  );
};

export const AuthFormCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <View style={styles.formCard}>{children}</View>;
};

type AuthTextInputProps = {
  label: string;
  leftIcon: keyof typeof Ionicons.glyphMap;
  errorText?: string;
  secureToggle?: boolean;
} & TextInputProps;

export const AuthTextInput: React.FC<AuthTextInputProps> = ({
  label,
  leftIcon,
  errorText,
  secureTextEntry,
  secureToggle = false,
  style,
  ...props
}) => {
  const [hidden, setHidden] = React.useState(Boolean(secureTextEntry));
  const isSecure = Boolean(secureTextEntry);
  const shouldToggle = isSecure && secureToggle;

  return (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputRow, errorText ? styles.inputRowError : null]}>
        <Ionicons name={leftIcon} size={20} color={colors.primary} />
        <TextInput
          {...props}
          style={[styles.input, style]}
          secureTextEntry={shouldToggle ? hidden : isSecure}
          placeholderTextColor={"#7b8494"}
        />
        {shouldToggle ? (
          <TouchableOpacity
            onPress={() => setHidden((value) => !value)}
            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
          >
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={"#7b8494"}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {errorText ? <Text style={styles.inputErrorText}>{errorText}</Text> : null}
    </View>
  );
};

type PrimaryButtonProps = {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  loading = false,
  disabled = false,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, (disabled || loading) && styles.primaryButtonDisabled]}
      disabled={disabled || loading}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {loading ? (
        <ActivityIndicator color={colors.background} />
      ) : (
        <Text style={styles.primaryButtonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

type AuthSwitchLinkProps = {
  text: string;
  actionText: string;
  onPress: () => void;
};

export const AuthSwitchLink: React.FC<AuthSwitchLinkProps> = ({
  text,
  actionText,
  onPress,
}) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.switchLink} activeOpacity={0.8}>
      <Text style={styles.switchText}>
        {text} <Text style={styles.switchAction}>{actionText}</Text>
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d7ebd4",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 154,
    overflow: "hidden",
    position: "relative",
    boxShadow: boxShadows.md,
    marginBottom: spacing.lg,
  },
  heroBlobLarge: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 999,
    right: -62,
    top: -36,
    backgroundColor: "rgba(14,149,63,0.09)",
  },
  heroBlobSmall: {
    position: "absolute",
    width: 132,
    height: 132,
    borderRadius: 999,
    right: -40,
    bottom: -66,
    backgroundColor: "rgba(14,149,63,0.11)",
  },
  heroTextWrap: {
    width: "66%",
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "800",
    color: "#0d5228",
    marginBottom: spacing.sm,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 20,
    color: "#334155",
    fontWeight: "500",
  },
  heroArtWrap: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
  },
  formCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inputBlock: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs + 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "#d6dbe3",
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "#fcfcfd",
  },
  inputRowError: {
    borderColor: "#f19a9a",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
    paddingVertical: spacing.xs,
  },
  inputErrorText: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.error,
    fontWeight: "500",
  },
  primaryButton: {
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "800",
  },
  switchLink: {
    marginTop: spacing.md,
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  switchText: {
    color: "#3e4b5d",
    fontSize: 13,
    fontWeight: "500",
  },
  switchAction: {
    color: colors.primary,
    fontWeight: "700",
  },
});
