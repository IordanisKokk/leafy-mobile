import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme";

type HeaderProps = {
  title?: string;          // optional text under the logo
  showBackButton?: boolean; // should *this* screen show a back button?
  showLogo?: boolean;       // should show the grwbl logo?
  hide?: boolean;           // sometimes: no header at all
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    accessibilityLabel?: string;
  };
};

const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  showLogo = true,
  hide = false,
  rightAction,
}) => {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();

  if (hide) return null;

  const handleBack = () => {
    if (canGoBack) {
      navigation.goBack();
    }
  };

  const shouldShowBack = showBackButton && canGoBack;

  return (
    <View style={styles.container}>
      {/* Left: back button if we can go back (and it's allowed), otherwise leaf icon */}
      {shouldShowBack ? (
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="caret-back-outline"
            size={16}
            color={colors.primary}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.logoContainer}>
          {
            title === "Settings" ?
              <Ionicons name="settings" size={25} color={colors.primary} /> :
              <Ionicons name="leaf" size={25} color={colors.primary} />
          }
        </View>
      )}

      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>{title ?? "grwbl"}</Text>
      </View>

      {rightAction ? (
        <TouchableOpacity
          onPress={rightAction.onPress}
          style={styles.rightAction}
          accessibilityRole="button"
          accessibilityLabel={rightAction.accessibilityLabel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={rightAction.icon}
            size={22}
            color={colors.primary}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.rightPlaceholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xxxl,     // spacing from status bar (changed from xxxl)
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  backButton: {
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  logoText: {
    marginLeft: spacing.xs,
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
  },
  rightPlaceholder: {
    width: 32,
  },
  rightAction: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Header;
