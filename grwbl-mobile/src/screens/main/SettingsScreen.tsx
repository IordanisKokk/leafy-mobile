import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, boxShadows } from "../../theme";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";

const SettingsScreen: React.FC = () => {

  const { logout } = useAuth();

  const handleLogoutPress = () => {
    console.log("Logout pressed");
    logout();
  }
  return (
    <View style={styles.container}>
      <Header title="Settings" showBackButton={false} showLogo={true} hide={false} />
      <Text style={styles.subtitle}>
        App settings and profile options will go here.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>General</Text>

        <TouchableOpacity style={styles.row} activeOpacity={0.7}>
          <View>
            <Text style={styles.rowTitle}>Account</Text>
            <Text style={styles.rowSubtitle}>
              Manage your profile (placeholder)
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textMuted}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} activeOpacity={0.7}>
          <View>
            <Text style={styles.rowTitle}>Notifications</Text>
            <Text style={styles.rowSubtitle}>
              Watering reminders and tips
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textMuted}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} activeOpacity={0.7}>
          <View>
            <Text style={styles.rowTitle}>Theme</Text>
            <Text style={styles.rowSubtitle}>
              Light / dark (coming soon)
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>
      <View style={[styles.section, {marginTop: spacing.xl}]}>
        <TouchableOpacity style={styles.row} onPress={handleLogoutPress} activeOpacity={0.7}>
          <View>
            <Text style={styles.logoutLabel}>Log out</Text>
          </View>
          <Ionicons
            name="log-out-outline"
            size={18}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: spacing.sm,
    color: colors.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.md,
  },
  sectionLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  row: {
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowTitle: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "500",
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  logoutLabel: {
    fontSize: 15,
    color: colors.error,
    fontWeight: "500",
  }
});

export default SettingsScreen;
