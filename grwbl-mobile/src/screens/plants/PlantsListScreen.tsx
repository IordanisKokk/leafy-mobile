// src/screens/plants/PlantsListScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { PlantsStackParamList } from "../../navigation/PlantsStackNavigator";
import { colors, spacing, radius, boxShadows } from "../../theme";
import { Plant, deletePlant, fetchPlants } from "../../api/plants";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "../../context/SnackbarContext";
import FormField from "../../components/FormField";

type Props = NativeStackScreenProps<PlantsStackParamList, "PlantsList">;

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
    Alert.alert(
      "Delete plant?",
      "This will permanently remove this plant.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!auth.token) {
              showSnackbar({ message: "You are not signed in.", type: "error", duration: 2000 });
              return;
            }
            try {
              await deletePlant(plant.id, auth.token);
              setPlants((prev) => prev.filter((item) => item.id !== plant.id));
              showSnackbar({ message: "Plant deleted", type: "success", duration: 2000 });
            } catch (err) {
              console.error("deletePlant failed:", err);
              const msg = err instanceof Error ? err.message : String(err);

              if (msg.includes("401") || msg.includes("403")) {
                auth.logout?.();
                showSnackbar({ message: "Your session has expired. Please log in again.", type: "error", duration: 2000 });
                return;
              }

              showSnackbar({ message: "Could not delete plant. Please try again.", type: "error", duration: 2000 });
            }
          },
        },
      ],
    );
  };

  const handleOpenPlant = (plant: Plant) => {
    navigation.navigate("PlantDetails", { plant });
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

  const getPlantStatus = (plant: Plant) => {
    const intervalDays = plant.wateringIntervalDays ?? plant.wateringFrequencyDays;
    if (!intervalDays || intervalDays <= 0) {
      return { label: "No schedule", tone: "neutral", diffDays: null } as const;
    }
    if (!plant.lastWateredAt) {
      return { label: "Needs last watered", tone: "neutral", diffDays: null } as const;
    }

    const last = new Date(plant.lastWateredAt);
    if (Number.isNaN(last.getTime())) {
      return { label: "Needs last watered", tone: "neutral", diffDays: null } as const;
    }

    const next = new Date(last);
    next.setDate(next.getDate() + intervalDays);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDay = new Date(next);
    nextDay.setHours(0, 0, 0, 0);

    const diffDays = Math.round(
      (nextDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) {
      return { label: "Overdue", tone: "overdue", diffDays } as const;
    }
    if (diffDays === 0) {
      return { label: "Due today", tone: "due", diffDays } as const;
    }
    if (diffDays <= 2) {
      return { label: "Due soon", tone: "due", diffDays } as const;
    }

    return { label: "On track", tone: "upcoming", diffDays } as const;
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

  useFocusEffect(
    React.useCallback(() => {
      void loadPlants();
    }, [loadPlants]),
  );

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

  const renderPlantItem = ({ item }: { item: Plant }) => {
    const nextWateringLabel = computeNextWateringLabel(item);
    const intervalDays = item.wateringIntervalDays ?? item.wateringFrequencyDays;
    const frequencyLabel = intervalDays
      ? `Every ${intervalDays} days`
      : "Not set";
    const status = getPlantStatus(item);
    const speciesLabel = item.species?.commonName ?? item.species?.scientificName ?? "Unknown species";
    const locationLabel = [item.room, item.location].filter(Boolean).join(" · ");
    const lastWateredDate = item.lastWateredAt ? new Date(item.lastWateredAt) : null;
    const hasValidLastWatered = lastWateredDate && !Number.isNaN(lastWateredDate.getTime());
    let progressPercent: number | null = null;
    let progressText: string | null = null;
    let cycleLabel: string | null = null;

    if (intervalDays && intervalDays > 0 && hasValidLastWatered && lastWateredDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const last = new Date(lastWateredDate);
      last.setHours(0, 0, 0, 0);

      const daysSince = Math.max(
        0,
        Math.round((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const remainingDays = intervalDays - daysSince;
      progressPercent = Math.min(1, daysSince / intervalDays) * 100;
      cycleLabel = `${Math.min(daysSince, intervalDays)}/${intervalDays}d`;

      if (remainingDays < 0) {
        progressText = `Overdue by ${Math.abs(remainingDays)}d`;
      } else if (remainingDays === 0) {
        progressText = "Due today";
      } else {
        progressText = `Due in ${remainingDays}d`;
      }
    }

    const lastWateredLabel = hasValidLastWatered && lastWateredDate
      ? lastWateredDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
      : "Not set";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => handleOpenPlant(item)}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.plantName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>

        <Text style={styles.speciesText} numberOfLines={1}>
          {speciesLabel}
        </Text>

        {locationLabel ? (
          <Text style={styles.locationText} numberOfLines={1}>
            {locationLabel}
          </Text>
        ) : null}

        <Text style={styles.frequencyText} numberOfLines={1}>
          {frequencyLabel}
        </Text>

        <Text style={styles.lastWateredText} numberOfLines={1}>
          Last watered: {lastWateredLabel}
        </Text>

        {progressPercent !== null && progressText ? (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{progressText}</Text>
              {cycleLabel ? (
                <Text style={styles.progressMeta}>{cycleLabel}</Text>
              ) : null}
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  status.tone === "overdue"
                    ? styles.progressFillOverdue
                    : status.tone === "due"
                      ? styles.progressFillDue
                      : styles.progressFillUpcoming,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Next watering</Text>
          <Text style={styles.metaValue} numberOfLines={1}>
            {nextWateringLabel}
          </Text>
        </View>

        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={[
              styles.waterButton,
              status.tone === "overdue"
                ? styles.waterButtonOverdue
                : status.tone === "due"
                  ? styles.waterButtonDue
                  : styles.waterButtonDefault,
            ]}
            onPress={(event) => {
              event.stopPropagation();
              handleWaterPlant(item);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="water-outline"
              size={16}
              color={
                status.tone === "overdue" || status.tone === "due"
                  ? colors.background
                  : colors.primary
              }
            />
            <Text
              style={[
                styles.waterButtonText,
                status.tone === "overdue" || status.tone === "due"
                  ? styles.waterButtonTextOn
                  : styles.waterButtonTextDefault,
              ]}
            >
              Mark Watered
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(event) => {
              event.stopPropagation();
              handleDeletePlant(item);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const emptyStateTitle = plants.length === 0 ? "No plants yet" : "No matches";
  const emptyStateMessage =
    plants.length === 0
      ? "Add your first plant to start tracking its care."
      : "Try a different search term.";

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
      ) : (
        <View style={{ flex: 1 }}>
          <FormField
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search plants…"
            autoCapitalize="none"
            autoCorrect={false}
            containerStyle={styles.searchField}
          />

          <FlatList
            data={filteredPlants}
            keyExtractor={(item, index) => item.id ?? `plant-${index}`}
            renderItem={renderPlantItem}
            contentContainerStyle={[
              styles.listContent,
              filteredPlants.length === 0 && styles.listContentEmpty,
            ]}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{emptyStateTitle}</Text>
                <Text style={styles.emptyText}>{emptyStateMessage}</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {!loading && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddPlant}
          accessibilityRole="button"
          accessibilityLabel="Add plant"
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
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

  searchField: {
    marginBottom: spacing.md,
  },

  listContent: {
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  listContentEmpty: {
    flexGrow: 1,
  },

  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.md,
    marginBottom: spacing.sm,
  },

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },

  plantName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    flexShrink: 1,
  },
  speciesText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  locationText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  frequencyText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  lastWateredText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  progressSection: {
    marginBottom: spacing.sm,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  progressMeta: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.pill,
  },
  progressFillOverdue: {
    backgroundColor: colors.error,
  },
  progressFillDue: {
    backgroundColor: colors.primary,
  },
  progressFillUpcoming: {
    backgroundColor: colors.primary,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.sm,
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
    marginTop: spacing.md,
  },

  waterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  waterButtonOverdue: {
    backgroundColor: colors.error,
  },
  waterButtonDue: {
    backgroundColor: colors.primary,
  },
  waterButtonDefault: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  waterButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  waterButtonTextOn: {
    color: colors.background,
  },
  waterButtonTextDefault: {
    color: colors.primary,
  },
  emptyState: {
    paddingTop: spacing.lg,
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  fabIcon: {
    color: colors.background,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 32,
  },
});

export default PlantsListScreen;
