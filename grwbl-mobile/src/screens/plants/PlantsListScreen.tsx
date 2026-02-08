// src/screens/plants/PlantsListScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PlantsStackParamList } from "../../navigation/PlantsStackNavigator";
import { colors, spacing, radius, boxShadows } from "../../theme";
import { Plant, fetchPlants } from "../../api/plants";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "../../context/SnackbarContext";

type Props = NativeStackScreenProps<PlantsStackParamList, "PlantsList">;

type GridItem =
  | { kind: "plant"; plant: Plant }
  | { kind: "add" }
  | { kind: "spacer" };

const PlantsListScreen: React.FC<Props> = ({ navigation }) => {
  const [plants, setPlants] = React.useState<Plant[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchInput, setSearchInput] = React.useState<string>("");

  const auth = useAuth();
  const { showSnackbar } = useSnackbar();

  const handleAddPlant = () => {
    navigation.navigate("SelectSpecies");
  };

  const handleWaterPlant = (plant: Plant) => {
    // Dummy for now
    console.log("Water pressed for plant:", plant.id, plant.name);
  };

  const handleDeletePlant = (plant: Plant) => {
    console.log("Delete pressed for plant:", plant.id, plant.name);
    showSnackbar({ message: "Delete is coming soon (dummy)", type: "info", duration: 2000 });
  };

  const handleOpenPlant = (plant: Plant) => {
    navigation.navigate("PlantDetails", { plant });
  };

  const formatDateLabel = (value?: string | null): string => {
    if (!value) return "Not recorded";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Not recorded";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const computeNextWateringLabel = (plant: Plant): string => {
    const intervalDays = plant.wateringIntervalDays ?? plant.wateringFrequencyDays;
    if (!intervalDays || intervalDays <= 0) {
      return "No schedule";
    }
    if (!plant.lastWateredAt) {
      return "Needs last watered";
    }
    const last = new Date(plant.lastWateredAt);
    if (Number.isNaN(last.getTime())) {
      return "Needs last watered";
    }
    const next = new Date(last);
    next.setDate(next.getDate() + intervalDays);
    return next.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const loadPlants = React.useCallback(async () => {
    if (!auth.token) {
      setError("You are not signed in. Please log in again.");
      setPlants([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const data = await fetchPlants(auth.token);
      setPlants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchPlants failed:", err);

      const msg = err instanceof Error ? err.message : String(err);

      if (msg.includes("401") || msg.includes("403")) {
        auth.logout?.();
        setError("Your session has expired. Please log in again.");
        setPlants([]);
        return;
      }

      setError("Could not load plants. Please try again.");
      setPlants([]);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  React.useEffect(() => {
    void loadPlants();
  }, [loadPlants]);

  const filteredPlants = React.useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return plants;

    return plants.filter((p) => {
      const plantName = (p.name ?? "").toLowerCase();
      const speciesCommon = (p.species?.commonName ?? "").toLowerCase();
      const speciesSci = (p.species?.scientificName ?? "").toLowerCase();
      const speciesId = (p.species?.id ?? p.speciesId ?? "").toLowerCase();

      return (
        plantName.includes(q) ||
        speciesCommon.includes(q) ||
        speciesSci.includes(q) ||
        speciesId.includes(q)
      );
    });
  }, [plants, searchInput]);

  const gridData: GridItem[] = React.useMemo(() => {
    const items: GridItem[] = filteredPlants.map((p) => ({ kind: "plant", plant: p }));
    items.push({ kind: "add" }); // always show add card at the end

    // With numColumns=2, a single item in the last row expands full-width.
    // Add an invisible spacer so the "Add plant" tile stays half-width.
    if (items.length % 2 === 1) {
      items.push({ kind: "spacer" });
    }

    return items;
  }, [filteredPlants]);

  const renderGridItem = ({ item }: { item: GridItem }) => {
    if (item.kind === "spacer") {
      return <View style={[styles.card, styles.spacerCard]} />;
    }

    if (item.kind === "add") {
      return (
        <TouchableOpacity style={[styles.card, styles.addCard]} onPress={handleAddPlant}>
          <Ionicons name="add-circle-outline" style={styles.addPlus} />
          <Text style={styles.addText}>Add plant</Text>
        </TouchableOpacity>
      );
    }

    const plant = item.plant;
    const lastWateredLabel = formatDateLabel(plant.lastWateredAt);
    const nextWateringLabel = computeNextWateringLabel(plant);
    const intervalDays = plant.wateringIntervalDays ?? plant.wateringFrequencyDays;
    const frequencyLabel = intervalDays
      ? `Every ${intervalDays}d`
      : "Not set";
    const speciesCommonName = plant.species?.commonName ?? "Unknown species";
    const speciesScientificName = plant.species?.scientificName;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => handleOpenPlant(plant)}
      >
        <View style={styles.cardTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.plantName} numberOfLines={1}>
              {plant.name}
            </Text>
            <Text style={styles.plantSpecies} numberOfLines={1}>
              {speciesScientificName
                ? `${speciesCommonName} · ${speciesScientificName}`
                : speciesCommonName}
            </Text>
            <Text style={styles.frequencyText} numberOfLines={1}>
              {frequencyLabel}
            </Text>
          </View>
        </View>

        <View style={styles.metaBlock}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Last</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {lastWateredLabel}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Next</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {nextWateringLabel}
            </Text>
          </View>
        </View>

        <View style={styles.cardActionsRow}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.waterButton}
              onPress={(e) => {
                e.stopPropagation();
                handleWaterPlant(plant);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.waterButtonText}>Water</Text>
            </TouchableOpacity>

          </View>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleDeletePlant(plant);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={colors.error}
              />
            </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="My plants" showBackButton={false} showLogo={true} hide={false} />

      <Text style={styles.subtitle}>
        Track watering, locations and health for all your green buddies.
      </Text>

      {/* Loading */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.centerText}>Loading plants…</Text>
        </View>
      ) : error ? (
        /* Error */
        <View style={styles.messageCard}>
          <Text style={styles.cardTitle}>Something went wrong</Text>
          <Text style={styles.cardText}>{error}</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={loadPlants}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : plants.length > 0 ? (
        /* Grid */
        <View style={{ flex: 1 }}>
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search by plant or species…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <FlatList
            data={gridData}
            keyExtractor={(item, index) =>
              item.kind === "add"
                ? "add-card"
                : item.kind === "spacer"
                  ? "spacer-card"
                  : item.plant.id ?? `plant-${index}`
            }
            renderItem={renderGridItem}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            ListFooterComponent={<View style={{ height: spacing.xl }} />}
          />
        </View>
      ) : (
        <View style={styles.container}>
          <View style={styles.noplantsCard}>
            <Text style={styles.cardTitle}>No plants yet</Text>
            <Text style={styles.cardText}>
              You haven't added any plants yet. Start by adding your first plant to
              keep track of its care and growth.
            </Text>

            <TouchableOpacity style={styles.primaryButton} onPress={handleAddPlant}>
              <Text style={styles.primaryButtonText}>Add your first plant</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  centerText: {
    fontSize: 14,
    color: colors.textMuted,
  },

  messageCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    boxShadow: boxShadows.sm,
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
  primaryButton: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.background,
  },

  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    marginBottom: spacing.md,
  },

  gridContent: {
    paddingBottom: spacing.md,
  },
  gridRow: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.md,
    minHeight: 148,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  plantName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  plantSpecies: {
    fontSize: 13,
    color: colors.textMuted,
  },

  frequencyText: {
    marginTop: 2,
    fontSize: 12,
    color: colors.primary,
    fontWeight: "700",
  },

  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  deleteButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.error,
  },

  metaBlock: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "700",
  },
  metaValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    color: colors.text,
    fontWeight: "700",
  },

  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },

  waterButton: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  waterButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.background,
  },

  tapHint: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  noplantsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    boxShadow: boxShadows.sm,
    alignItems: "flex-start",

  },
  addCard: {
    alignItems: "center",
    justifyContent: "center",
    borderColor: colors.primary,
    borderWidth: 1,
  },
  addPlus: {
    fontSize: 34,
    fontWeight: "900",
    color: colors.primary,
    marginBottom: 6,
  },
  addText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },

  spacerCard: {
    backgroundColor: "transparent",
    borderWidth: 0,
    boxShadow: undefined,
  },
});

export default PlantsListScreen;
