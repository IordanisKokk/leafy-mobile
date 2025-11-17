import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PlantsStackParamList } from "../../navigation/PlantsStackNavigator";
import { Container } from "@expo/ui/jetpack-compose-primitives";
import { boxShadows, colors, radius, spacing } from "../../theme";
import Header from "../../components/Header";

type Props = NativeStackScreenProps<PlantsStackParamList, "SelectSpecies">;

type SpeciesItem = {
  id: string;
  name: string;
};

const SPECIES: SpeciesItem[] = [
  { id: "monstera", name: "Monstera" },
  { id: "pothos", name: "Pothos" },
  { id: "ficus", name: "Ficus elastica" },
];

const SelectSpeciesScreen: React.FC<Props> = ({ navigation }) => {
  const handleSelect = (species: SpeciesItem) => {
    navigation.navigate("PlantForm", { speciesName: species.name });
  };

  return (
    <View style={styles.container}>
      <Header title="Select species" showBackButton={true} showLogo={false} hide={false} />

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Pick a species to create a new plant entry.
        </Text>

        <FlatList
          data={SPECIES}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.speciesItem}
              onPress={() => handleSelect(item)}
            >
              <Text style={styles.speciesName}>{item.name}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
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
  listContent: {
    paddingVertical: spacing.sm,
  },
  speciesItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  speciesName: {
    fontSize: 16,
    color: colors.text,
  },
});

export default SelectSpeciesScreen;
