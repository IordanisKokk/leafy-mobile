import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { boxShadows, colors, radius, spacing } from "../../../theme";

export type QuickAction = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
};

type Props = {
  actions: QuickAction[];
  overflowAction?: QuickAction;
  title?: string;
};

export const DockButton: React.FC<QuickAction> = ({
  label,
  icon,
  onPress,
  disabled,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.dockButton,
        disabled && styles.dockButtonDisabled,
        !disabled && pressed && styles.dockButtonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={[styles.dockAccent, disabled && styles.dockAccentDisabled]} />
      <Ionicons
        name={icon}
        size={22}
        color={disabled ? colors.textMuted : colors.primary}
      />
      <Text
        style={[styles.dockLabel, disabled && styles.dockLabelDisabled]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const QuickActionsDock: React.FC<Props> = ({
  actions,
  overflowAction,
  title = "Quick actions",
}) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const visibleActions =
    isCompact && overflowAction
      ? [...actions.slice(0, 3), overflowAction]
      : actions;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.dockRow}>
        {visibleActions.map((action) => (
          <DockButton key={action.id} {...action} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  dockRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dockButton: {
    flex: 1,
    minHeight: 76,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    position: "relative",
  },
  dockButtonPressed: {
    backgroundColor: colors.surface,
    borderColor: colors.primary + "40",
    transform: [{ scale: 0.98 }],
  },
  dockButtonDisabled: {
    opacity: 0.5,
  },
  dockAccent: {
    position: "absolute",
    top: 0,
    left: 8,
    right: 8,
    height: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    opacity: 0.5,
  },
  dockAccentDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.3,
  },
  dockLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  dockLabelDisabled: {
    color: colors.textMuted,
  },
});

export default QuickActionsDock;
