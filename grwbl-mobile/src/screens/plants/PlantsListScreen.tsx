// src/screens/plants/PlantsListScreen.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PlantsStackParamList } from "../../navigation/PlantsStackNavigator";
import { colors, spacing, radius, boxShadows } from "../../theme";
import Header from "../../components/Header";

type Props = NativeStackScreenProps<PlantsStackParamList, "PlantsList">;

const PlantsListScreen: React.FC<Props> = ({ navigation }) => {
  const handleAddPlant = () => {
    navigation.navigate("SelectSpecies");
  };

  return (
    <View style={styles.container}>
      <Header title="My plants" showBackButton={false} showLogo={true} hide={false} />
      <Text style={styles.subtitle}>
        Track watering, locations and health for all your green buddies.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>No plants yet</Text>
        <Text style={styles.cardText}>
          Start by adding your first plant. You can pick the species and give it
          a cute nickname.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleAddPlant}>
          <Text style={styles.buttonText}>Add plant</Text>
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
    borderRadius: radius.lg,
    padding: spacing.md,
    boxShadow: boxShadows.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: spacing.sm,
    color: colors.text,
  },
  cardText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.background,
  },
});

export default PlantsListScreen;
