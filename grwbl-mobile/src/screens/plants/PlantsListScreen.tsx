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
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const [selectedFilter, setSelectedFilter] = React.useState<
    "all" | "overdue" | "dueSoon" | "ok"
  >("all");
  const insets = useSafeAreaInsets();

  const auth = useAuth();
  const { showSnackbar } = useSnackbar();

  const handleAddPlant = () => {
    navigation.navigate("SelectSpecies");
  };

  const handleWaterPlant = (plant: Plant) => {
    showSnackbar({
      message: `Watered ${plant.name}`,
      type: "success",
      duration: 6000,
      actionLabel: "Undo",
      onAction: () => {
        showSnackbar({ message: "Watering undone", type: "info", duration: 2000 });
      },
    });
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

  const getPlantStatus = (plant: Plant) => {
    const intervalDays = plant.wateringIntervalDays ?? plant.wateringFrequencyDays;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!intervalDays || intervalDays <= 0) {
      return { label: "No schedule", tone: "ok", diffDays: null } as const;
    }

    if (!plant.lastWateredAt) {
      return { label: "Needs last watered", tone: "overdue", diffDays: null } as const;
    }

    const last = new Date(plant.lastWateredAt);
    if (Number.isNaN(last.getTime())) {
      return { label: "Needs last watered", tone: "overdue", diffDays: null } as const;
    }

    const next = new Date(last);
    next.setDate(next.getDate() + intervalDays);
    next.setHours(0, 0, 0, 0);

    const diffDays = Math.round(
      (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (!Number.isFinite(diffDays) || Math.abs(diffDays) > 3650) {
      return { label: "Schedule not set", tone: "ok", diffDays: null } as const;
    }

    if (diffDays < 0) {
      return { label: `Overdue by ${Math.abs(diffDays)}d`, tone: "overdue", diffDays } as const;
    }
    if (diffDays === 0) {
      return { label: "Due today", tone: "dueToday", diffDays } as const;
    }
    if (diffDays <= 3) {
      return { label: `Due in ${diffDays}d`, tone: "dueSoon", diffDays } as const;
    }

    return { label: `Due in ${diffDays}d`, tone: "ok", diffDays } as const;
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

    return plants.filter((plant) => {
      const status = getPlantStatus(plant);
      const matchesFilter = (() => {
        if (selectedFilter === "overdue") return status.tone === "overdue";
        if (selectedFilter === "dueSoon") return status.tone === "dueToday" || status.tone === "dueSoon";
        if (selectedFilter === "ok") return status.tone === "ok";
        return true;
      })();

      if (!matchesFilter) return false;
      if (!q) return true;

      const plantName = (plant.name ?? "").toLowerCase();
      const speciesCommon = (plant.species?.commonName ?? "").toLowerCase();
      const speciesSci = (plant.species?.scientificName ?? "").toLowerCase();
      const speciesId = (plant.species?.id ?? plant.speciesId ?? "").toLowerCase();
      const room = (plant.room ?? "").toLowerCase();
      const location = (plant.location ?? "").toLowerCase();

      return (
        plantName.includes(q) ||
        speciesCommon.includes(q) ||
        speciesSci.includes(q) ||
        speciesId.includes(q) ||
        room.includes(q) ||
        location.includes(q)
      );
    });
  }, [plants, searchInput, selectedFilter]);

  const overviewCounts = React.useMemo(() => {
    return plants.reduce(
      (acc, plant) => {
        const status = getPlantStatus(plant);
        if (status.tone === "overdue") acc.overdue += 1;
        if (status.tone === "dueToday" || status.tone === "dueSoon") acc.dueSoon += 1;
        acc.total += 1;
        return acc;
      },
      { overdue: 0, dueSoon: 0, ok: 0, total: 0 },
    );
  }, [plants]);

  const filterCounts = React.useMemo(() => {
    return plants.reduce(
      (acc, plant) => {
        const status = getPlantStatus(plant);
        acc.all += 1;
        if (status.tone === "overdue") acc.overdue += 1;
        if (status.tone === "dueToday" || status.tone === "dueSoon") acc.dueSoon += 1;
        if (status.tone === "ok") acc.ok += 1;
        return acc;
      },
      { all: 0, overdue: 0, dueSoon: 0, ok: 0 },
    );
  }, [plants]);

  const renderPlantItem = ({ item, index }: { item: Plant; index: number }) => {
    const status = getPlantStatus(item);
    const locationLabel = [item.room, item.location].filter(Boolean).join(" · ");
    const secondaryLabel =
      locationLabel ||
      item.species?.commonName ||
      item.species?.scientificName ||
      "Unknown location";
    const intervalDays = item.wateringIntervalDays ?? item.wateringFrequencyDays;
    const scheduleLabel = intervalDays && intervalDays > 0
      ? `Every ${intervalDays} days`
      : "Schedule not set";
    const statusColor = (() => {
      if (status.tone === "overdue") return colors.error;
      if (status.tone === "dueToday") return colors.primary;
      if (status.tone === "dueSoon") return "#f59e0b";
      return colors.textMuted;
    })();
    const isLast = index === filteredPlants.length - 1;

    return (
      <Pressable
        onPress={() => handleOpenPlant(item)}
        onLongPress={() => handleDeletePlant(item)}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel={`${item.name} details`}
        style={({ pressed }) => [
          styles.listRow,
          { borderLeftColor: statusColor },
          pressed && styles.listRowPressed,
          isLast && styles.listRowLast,
        ]}
      >
        <View style={styles.listLeft}>
          <View style={styles.listThumb} />
          <View style={styles.listInfo}>
            <Text style={styles.listName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.listLocation} numberOfLines={1}>
              {secondaryLabel}
            </Text>
            <Text style={styles.listMicro} numberOfLines={1}>
              {scheduleLabel}
            </Text>
            <View style={styles.listStatusRow}>
              <View style={[styles.listStatusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.listStatusText, { color: statusColor }]}>
                {status.label}
              </Text>
            </View>
          </View>
        </View>
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            handleWaterPlant(item);
          }}
          style={({ pressed }) => [
            styles.quickAction,
            pressed && styles.quickActionPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${item.name} watered`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {({ pressed }) => (
            <Ionicons
              name="water-outline"
              size={16}
              color={pressed ? colors.background : colors.primary}
            />
          )}
        </Pressable>
      </Pressable>
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
          <LinearGradient
            colors={[colors.primarySoft, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.overviewCard}
          >
            <View style={styles.overviewContent}>
              <Text style={styles.overviewTitle}>Overview</Text>
              <View style={styles.overviewMetricsInline}>
                <View style={styles.overviewMetric}>
                  <View style={[styles.overviewDot, styles.overviewDotOverdue]} />
                  <Text style={styles.overviewLabel}>Overdue</Text>
                  <Text style={styles.overviewValue}>{overviewCounts.overdue}</Text>
                </View>
                <View style={styles.overviewMetric}>
                  <View style={[styles.overviewDot, styles.overviewDotDueSoon]} />
                  <Text style={styles.overviewLabel}>Due soon</Text>
                  <Text style={styles.overviewValue}>{overviewCounts.dueSoon}</Text>
                </View>
                <View style={styles.overviewMetric}>
                  <View style={[styles.overviewDot, styles.overviewDotTotal]} />
                  <Text style={styles.overviewLabel}>Total</Text>
                  <Text style={styles.overviewValue}>{overviewCounts.total}</Text>
                </View>
              </View>
            </View>
            <View style={styles.overviewArt}>
              <View style={styles.overviewBubbleLarge} />
              <View style={styles.overviewBubbleSmall} />
            </View>
          </LinearGradient>

          <FormField
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search plants…"
            autoCapitalize="none"
            autoCorrect={false}
            containerStyle={styles.searchField}
          />

          <View style={styles.segmentedControl}>
            {(
              [
                { key: "all", label: `All (${filterCounts.all})` },
                { key: "overdue", label: `Overdue (${filterCounts.overdue})` },
                { key: "dueSoon", label: `Due soon (${filterCounts.dueSoon})` },
                { key: "ok", label: `OK (${filterCounts.ok})` },
              ] as const
            ).map((segment) => {
              const isActive = selectedFilter === segment.key;
              return (
                <Pressable
                  key={segment.key}
                  onPress={() => setSelectedFilter(segment.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`${segment.label} filter`}
                  style={({ pressed }) => [
                    styles.segmentedItem,
                    isActive && styles.segmentedItemActive,
                    pressed && styles.segmentedItemPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentedLabel,
                      isActive && styles.segmentedLabelActive,
                    ]}
                  >
                    {segment.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.listCard}>
            <FlatList
              data={filteredPlants}
              keyExtractor={(item, index) => item.id ?? `plant-${index}`}
              renderItem={renderPlantItem}
              contentContainerStyle={[
                styles.listContent,
                filteredPlants.length === 0 && styles.listContentEmpty,
                { paddingBottom: insets.bottom + spacing.xxxl + 80 },
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
  overviewCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(14,149,63,0.2)",
    boxShadow: boxShadows.sm,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  overviewContent: {
    zIndex: 1,
  },
  overviewTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  overviewMetricsInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  overviewMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  overviewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  overviewDotOverdue: {
    backgroundColor: colors.error,
  },
  overviewDotDueSoon: {
    backgroundColor: "#f59e0b",
  },
  overviewDotTotal: {
    backgroundColor: colors.textMuted,
  },
  overviewLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },
  overviewValue: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
  overviewArt: {
    position: "absolute",
    right: -18,
    top: -16,
    width: 140,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  overviewBubbleLarge: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(134, 251, 177, 0.41)",
    top: -10,
    right: 6,
  },
  overviewBubbleSmall: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(46, 238, 116, 0.27)",
    top: 36,
    right: 36,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  segmentedItem: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedItemActive: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentedItemPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  segmentedLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  segmentedLabelActive: {
    color: colors.text,
  },

  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.sm,
    overflow: "hidden",
  },

  listContent: {
    paddingBottom: spacing.xxxl,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 3,
    backgroundColor: colors.surface,
  },
  listRowPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  listLeft: {
    flexDirection: "row",
    gap: spacing.sm,
    flex: 1,
    paddingRight: spacing.sm,
  },
  listThumb: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 20,
  },
  listLocation: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textMuted,
  },
  listMicro: {
    marginTop: spacing.xs,
    fontSize: 11,
    color: colors.textMuted,
  },
  listStatusRow: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  listStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  listStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  quickAction: {
    minWidth: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionPressed: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
