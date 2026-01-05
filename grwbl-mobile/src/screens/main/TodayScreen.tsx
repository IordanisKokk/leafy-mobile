import Header from "../../components/Header";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, boxShadows } from "../../theme";
import { get } from "../../api/client";

const TodayScreen: React.FC = () => {
  const hasPlants = false;

type SpeciesFromApi = {
  id: string;
  commonName: string;
  scientificName: string;

};

  return (
    <View style={styles.container}>
      <Header title="grwbl" showBackButton={false} showLogo={true} hide={false} />

      <View style={styles.content}>
        {/* <Text style={styles.title}>Today</Text> */}
        <Text style={styles.subtitle}>
          Your plant tasks for today will show up here.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Watering</Text>
          <Text style={styles.cardText}>
            {hasPlants
              ? "You have 3 plants to water today."
              : "No watering tasks yet. Add a plant to get started."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reminders</Text>
          <Text style={styles.cardText}>
            Notifications are off for now. You&apos;ll be able to turn them on
            from settings later.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    boxShadow: boxShadows.md,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: spacing.sm,
    color: colors.primary,
  },
  cardText: {
    fontSize: 14,
    color: colors.textMuted,
  }
});

export default TodayScreen;