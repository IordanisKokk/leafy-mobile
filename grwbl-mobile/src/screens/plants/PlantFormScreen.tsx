import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PlantsStackParamList } from "../../navigation/PlantsStackNavigator";
import { boxShadows, colors, radius, spacing } from "../../theme";
import Header from "../../components/Header";

type Props = NativeStackScreenProps<PlantsStackParamList, "PlantForm">;

const PlantFormScreen: React.FC<Props> = ({ route }) => {
  const { speciesName } = route.params;
  console.log("Rendering PlantFormScreen for species:", speciesName);
  return (
    <View style={styles.container}>
      <Header title="New plant" showBackButton={true} showLogo={false} hide={false} />
      <Text style={styles.subtitle}>
        Creating plant for: <Text style={styles.species}>{speciesName}</Text>
      </Text>

      {/* Just some placeholder form fields for now */}
      <Text style={styles.label}>Nickname</Text>
      <TextInput
        style={styles.input}
        placeholder={`e.g. Living room ${speciesName}`}
        placeholderTextColor="#64748b"
      />

      <Text style={styles.label}>Location</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Living room window"
        placeholderTextColor="#64748b"
      />
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
  species: {
    fontWeight: "700",
    color: colors.text,
  },
  label: {
    fontSize: 14,
    marginBottom: spacing.xs,
    color: colors.text,
  },
  input: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    color: colors.text,
    backgroundColor: colors.surface,
    boxShadow: boxShadows.md,
  },
});


export default PlantFormScreen;
