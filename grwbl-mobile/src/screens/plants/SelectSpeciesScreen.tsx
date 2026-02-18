import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PlantsStackParamList } from "../../navigation/PlantsStackNavigator";
import { boxShadows, colors, radius, spacing } from "../../theme";
import Header from "../../components/Header";
import { Species, fetchSpeciesList } from "../../api/species";
import { Ionicons } from "@expo/vector-icons";
import FormField from "../../components/FormField";


type Props = NativeStackScreenProps<PlantsStackParamList, "SelectSpecies">;

const SelectSpeciesScreen: React.FC<Props> = ({ navigation }) => {
  const [species, setSpecies] = React.useState<Species[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [searchInput, setSearchInput] = React.useState<string>("");
  const skeletonItems = React.useMemo(
    () => Array.from({ length: 6 }, (_, index) => `skeleton-${index}`),
    []
  );
  React.useEffect(() => {
    let isMounted = true;

    const loadSpecies = async () => {
      setLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const data = await fetchSpeciesList();
        if (isMounted) {
          setSpecies(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadSpecies();

    return () => {
      isMounted = false;
    };
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

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Pick a species to create a new plant entry.
        </Text>
        <FormField
          placeholder="Search species..."
          value={searchInput}
          onChangeText={handleSearchChange}
          editable={!loading}
          containerStyle={styles.searchField}
        />

        {loading ? (
          <View style={styles.skeletonList}>
            {skeletonItems.map((key) => (
              <View key={key} style={styles.skeletonItem}>
                <View style={styles.skeletonImage} />
                <View style={styles.skeletonText}>
                  <View style={styles.skeletonLine} />
                  <View style={styles.skeletonLineShort} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={species
              .filter((item) =>
                item.commonName
                  .toLowerCase()
                  .includes(searchInput.toLowerCase())
              )
              .slice(0, 50)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.speciesItem}
                onPress={() => handleSelect(item)}
              >
                <View style={styles.speciesItemContent}>
                  {/* TODO: Replace with real species illustration/image. */}
                  <View style={styles.speciesImagePlaceholder} />
                  <View style={styles.speciesText}>
                    <Text style={styles.speciesName}>{item.commonName}</Text>
                    <Text style={styles.speciesDetails}>{item.scientificName}</Text>
                  </View>
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
        )}
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
  searchField: {
    marginBottom: spacing.lg,
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
  skeletonList: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  skeletonItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.sm,
    gap: spacing.md,
  },
  skeletonImage: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: "#e2e8f0",
  },
  skeletonText: {
    flex: 1,
    gap: spacing.xs,
  },
  skeletonLine: {
    height: 12,
    borderRadius: radius.sm,
    backgroundColor: "#e2e8f0",
    width: "70%",
  },
  skeletonLineShort: {
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: "#e2e8f0",
    width: "45%",
  },
  speciesItem: {
    flexDirection: "row",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: boxShadows.sm,
  },
  speciesItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  speciesImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  speciesText: {
    flex: 1,
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
