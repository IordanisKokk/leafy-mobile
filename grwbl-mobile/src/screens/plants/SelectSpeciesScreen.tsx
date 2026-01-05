import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PlantsStackParamList } from "../../navigation/PlantsStackNavigator";
import { boxShadows, colors, radius, spacing } from "../../theme";
import Header from "../../components/Header";
import { Species, fetchSpeciesList } from "../../api/species";
import { Ionicons } from "@expo/vector-icons";


type Props = NativeStackScreenProps<PlantsStackParamList, "SelectSpecies">;

const SelectSpeciesScreen: React.FC<Props> = ({ navigation }) => {
  const [species, setSpecies] = React.useState<Species[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [searchInput, setSearchInput] = React.useState<string>("");
  React.useEffect(() => {
    setLoading(true);
    setTimeout(() => {

      fetchSpeciesList()
        .then(setSpecies)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 1000); // simulate delay
  }, []);

  const handleSelect = (species: Species) => {
    navigation.navigate("PlantForm", { species: species });
  };

  const handleSearchChange = (inputText: string) => {
    setSearchInput(inputText);
  }

  return (
    <View style={styles.container}>
      <Header title="Select species" showBackButton={true} showLogo={false} hide={false} />

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text>Loading species...</Text>
        </View>
      ) :
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Pick a species to create a new plant entry.
          </Text>
          <TextInput style={styles.input} placeholder="Search species..." placeholderTextColor="#64748b" onChangeText={handleSearchChange} />

          <FlatList
            style={styles.list}
            data={species.filter(s => s.commonName.toLowerCase().includes(searchInput.toLowerCase())).slice(0, 50)} // limit to first 10 for performance
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.speciesItem}
                onPress={() => handleSelect(item)}
              >
                <View>
                  <Text style={styles.speciesName}>{item.commonName}</Text>
                  <Text style={styles.speciesDetails}>{item.scientificName}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  color={colors.primarySoft}
                  size={18}
                />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={<View style={styles.listFooter} />}
          />
        </View>
      }
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
  input: {
    height: 40,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    color: colors.text,
    backgroundColor: colors.surface,
    boxShadow: boxShadows.sm,
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
  list: {
    flex: 1,
    // something to cover the sharp edge on top when scrolling
    paddingTop: spacing.xs,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xl,
  },
  speciesItem: {
    flexDirection: "row",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: boxShadows.sm,
  },
  speciesDetails: {
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
  speciesName: {
    fontSize: 16,
    color: colors.text,
  },
  listFooter: {
    height: spacing.lg,
  },
});

export default SelectSpeciesScreen;
