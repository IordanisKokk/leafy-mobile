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
  Image,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlantsStackParamList } from "../../navigation/PlantsStackNavigator";
import { colors, spacing, radius, boxShadows, todayTheme } from "../../theme";
import { Plant, deletePlant, fetchPlants } from "../../api/plants";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "../../context/SnackbarContext";

type Props = NativeStackScreenProps<PlantsStackParamList, "PlantsList">;
type FilterKey = "all" | "overdue" | "dueSoon" | "ok";
type PlantStatusTone = "setup" | "overdue" | "dueSoon" | "ok";

type PlantWateringStatus = {
  tone: PlantStatusTone;
  badgeLabel: string;
  nextWateringLabel: string;
  diffDays: number | null;
};

type PlantCardVM = {
  plant: Plant;
  status: PlantWateringStatus;
};
type HeroTone = "calm" | "today" | "overdue";

const heroPaletteByTone: Record<
  HeroTone,
  { gradient: readonly [string, string]; border: string; bubbles: readonly [string, string, string] }
> = {
  calm: {
    gradient: todayTheme.hero.neutral.gradient,
    border: todayTheme.hero.neutral.border,
    bubbles: todayTheme.hero.neutral.bubbles,
  },
  today: {
    gradient: todayTheme.hero.due.gradient,
    border: todayTheme.hero.due.border,
    bubbles: todayTheme.hero.due.bubbles,
  },
  overdue: {
    gradient: todayTheme.hero.overdue.gradient,
    border: todayTheme.hero.overdue.border,
    bubbles: todayTheme.hero.overdue.bubbles,
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_WINDOW_DAYS = 3;
const HERO_RADIUS = 22;

const statusPalette: Record<PlantStatusTone, { bg: string; text: string }> = {
  ok: { bg: "#dff4e7", text: "#15803d" },
  dueSoon: { bg: "#fff1d6", text: "#c26700" },
  overdue: { bg: "#fee2e2", text: "#b42318" },
  setup: { bg: "#e8eef9", text: "#475569" },
};

const startOfDay = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const getPlantDisplayName = (plant: Plant): string => {
  const name = plant.name?.trim();
  if (name) return name;
  return plant.species?.commonName ?? plant.species?.scientificName ?? "Unnamed plant";
};

const getPlantImageUrl = (plant: Plant): string | null => {
  const directUrl = (plant as Plant & { imageUrl?: string }).imageUrl;
  return directUrl ?? plant.species?.imageUrl ?? null;
};

const getPlantRoomLabel = (plant: Plant): string => {
  const room = plant.room?.trim();
  const location = plant.location?.trim();

  if (room && location) return `${room} - ${location}`;
  if (room) return room;
  if (location) return location;
  return "No room set";
};

const getPlantFrequencyLabel = (plant: Plant): string => {
  const intervalDays =
    plant.wateringIntervalDays ??
    plant.wateringFrequencyDays ??
    plant.species?.defaultWateringIntervalDays ??
    plant.species?.defaultwateringFrequencyDays;

  if (!intervalDays || intervalDays <= 0) return "Set watering frequency";
  return `Every ${intervalDays} days`;
};

const getPlantWateringStatus = (plant: Plant): PlantWateringStatus => {
  const intervalDays =
    plant.wateringIntervalDays ??
    plant.wateringFrequencyDays ??
    plant.species?.defaultWateringIntervalDays ??
    plant.species?.defaultwateringFrequencyDays;

  if (!intervalDays || intervalDays <= 0) {
    return {
      tone: "setup",
      badgeLabel: "Setup needed",
      nextWateringLabel: "Set watering frequency",
      diffDays: null,
    };
  }

  const lastWatered = parseDate(plant.lastWateredAt);
  if (!lastWatered) {
    return {
      tone: "setup",
      badgeLabel: "Setup needed",
      nextWateringLabel: "Set last watered date",
      diffDays: null,
    };
  }

  const nextWatering = new Date(lastWatered);
  nextWatering.setDate(nextWatering.getDate() + intervalDays);

  const today = startOfDay(new Date());
  const dueDate = startOfDay(nextWatering);
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / DAY_MS);

  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return {
      tone: "overdue",
      badgeLabel: "Overdue",
      nextWateringLabel: `Overdue by ${days} day${days === 1 ? "" : "s"}`,
      diffDays,
    };
  }

  if (diffDays === 0) {
    return {
      tone: "dueSoon",
      badgeLabel: "Due soon",
      nextWateringLabel: "Due today",
      diffDays,
    };
  }

  if (diffDays <= DUE_SOON_WINDOW_DAYS) {
    return {
      tone: "dueSoon",
      badgeLabel: "Due soon",
      nextWateringLabel: `Next watering in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
      diffDays,
    };
  }

  return {
    tone: "ok",
    badgeLabel: "OK",
    nextWateringLabel: `Next watering in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
    diffDays,
  };
};

const getNextWateringLabel = (plant: Plant): string => {
  return getPlantWateringStatus(plant).nextWateringLabel;
};

const matchesSearch = (plant: Plant, query: string): boolean => {
  if (!query) return true;
  const text = query.trim().toLowerCase();
  if (!text) return true;

  const haystack = [
    plant.name,
    plant.species?.commonName,
    plant.species?.scientificName,
    plant.room,
    plant.location,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase();

  return haystack.includes(text);
};

const toneMatchesFilter = (tone: PlantStatusTone, filter: FilterKey): boolean => {
  if (filter === "all") return true;
  if (filter === "overdue") return tone === "overdue" || tone === "setup";
  if (filter === "dueSoon") return tone === "dueSoon";
  return tone === "ok";
};

const getOverviewMessage = (overdueCount: number, dueSoonCount: number): string => {
  if (overdueCount > 0) return "Some plants need attention.";
  if (dueSoonCount > 0) return "A few plants need care soon.";
  return "Here's how they're doing.";
};

const StatusBadge: React.FC<{ tone: PlantStatusTone; label: string }> = ({ tone, label }) => {
  const palette = statusPalette[tone];
  return (
    <View style={[styles.statusBadge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.statusBadgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
};

const OverviewHeroCard: React.FC<{
  totalPlants: number;
  overdue: number;
  dueSoon: number;
  ok: number;
  empty: boolean;
  tone: HeroTone;
  onAddPlant: () => void;
}> = ({ totalPlants, overdue, dueSoon, ok, empty, tone, onAddPlant }) => {
  const palette = heroPaletteByTone[tone];
  const heroText = todayTheme.hero.text;

  if (empty) {
    return (
      <View style={[styles.overviewHeroShell, { borderColor: heroPaletteByTone.calm.border }]}>
        <LinearGradient
          colors={heroPaletteByTone.calm.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.overviewHero}
        >
          <View style={[styles.heroBlobLarge, { backgroundColor: heroPaletteByTone.calm.bubbles[0] }]} />
          <View style={[styles.heroBlobSmall, { backgroundColor: heroPaletteByTone.calm.bubbles[1] }]} />
          <View style={styles.emptyHeroContent}>
            <Text style={styles.emptyHeroTitle}>Start your plant collection</Text>
            <Text style={styles.emptyHeroText}>
              Add your first plant to begin tracking watering and care.
            </Text>
            <TouchableOpacity style={styles.emptyHeroButton} onPress={onAddPlant} activeOpacity={0.86}>
              <Ionicons name="add-circle" size={18} color={colors.background} />
              <Text style={styles.emptyHeroButtonText}>Add your first plant</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.emptyHeroArt}>
            <Ionicons name="leaf" size={56} color="rgba(14,149,63,0.36)" />
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.overviewHeroShell, { borderColor: palette.border }]}>
      <LinearGradient
        colors={palette.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.overviewHero}
      >
        <View style={[styles.heroBlobLarge, { backgroundColor: palette.bubbles[0] }]} />
        <View style={[styles.heroBlobSmall, { backgroundColor: palette.bubbles[1] }]} />

        <Text style={[styles.overviewLabel, { color: heroText.secondary }]}>Overview</Text>
        <Text style={[styles.overviewPlantsCount, { color: heroText.primary }]}>{totalPlants} plants</Text>
        <Text style={[styles.overviewSupport, { color: heroText.secondary }]}>
          {getOverviewMessage(overdue, dueSoon)}
        </Text>

        <View style={styles.overviewStatsStrip}>
          <View style={styles.overviewStatItem}>
            <View style={[styles.overviewStatDot, { backgroundColor: "#ef4444" }]} />
            <Text style={[styles.overviewStatValue, { color: heroText.primary }]}>{overdue}</Text>
            <Text style={[styles.overviewStatLabel, { color: heroText.muted }]}>Overdue</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewStatItem}>
            <View style={[styles.overviewStatDot, { backgroundColor: "#f59e0b" }]} />
            <Text style={[styles.overviewStatValue, { color: heroText.primary }]}>{dueSoon}</Text>
            <Text style={[styles.overviewStatLabel, { color: heroText.muted }]}>Due soon</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewStatItem}>
            <View style={[styles.overviewStatDot, { backgroundColor: "#22c55e" }]} />
            <Text style={[styles.overviewStatValue, { color: heroText.primary }]}>{ok}</Text>
            <Text style={[styles.overviewStatLabel, { color: heroText.muted }]}>OK</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const PlantFilterPills: React.FC<{
  selected: FilterKey;
  onSelect: (value: FilterKey) => void;
  counts: { all: number; overdue: number; dueSoon: number; ok: number };
}> = ({ selected, onSelect, counts }) => {
  const pills: Array<{ key: FilterKey; label: string }> = [
    { key: "all", label: `All (${counts.all})` },
    { key: "overdue", label: `Overdue (${counts.overdue})` },
    { key: "dueSoon", label: `Due soon (${counts.dueSoon})` },
    { key: "ok", label: `OK (${counts.ok})` },
  ];

  return (
    <View style={styles.filtersWrap}>
      {pills.map((pill) => {
        const active = selected === pill.key;
        return (
          <Pressable
            key={pill.key}
            onPress={() => onSelect(pill.key)}
            style={({ pressed }) => [
              styles.filterPill,
              active && styles.filterPillActive,
              pressed && styles.filterPillPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{pill.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const PlantListCard: React.FC<{
  item: Plant;
  onOpen: (plant: Plant) => void;
  onDelete: (plant: Plant) => void;
}> = ({ item, onOpen, onDelete }) => {
  const displayName = getPlantDisplayName(item);
  const imageUrl = getPlantImageUrl(item);
  const roomLabel = getPlantRoomLabel(item);
  const speciesName = item.species?.commonName ?? item.species?.scientificName ?? "Unknown species";
  const status = getPlantWateringStatus(item);
  const frequencyLabel = getPlantFrequencyLabel(item);
  const palette = statusPalette[status.tone];

  return (
    <Pressable
      onPress={() => onOpen(item)}
      onLongPress={() => onDelete(item)}
      delayLongPress={400}
      style={({ pressed }) => [styles.plantCard, pressed && styles.plantCardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${displayName}`}
    >
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardMainInfoWrap}>
          <View style={styles.thumbnailWrap}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.thumbnailImage} />
            ) : (
              <View style={styles.thumbnailFallback}>
                <Ionicons name="leaf-outline" size={24} color={colors.primary} />
              </View>
            )}
          </View>

          <View style={styles.cardTextWrap}>
            <Text style={styles.cardPlantName} numberOfLines={2}>
              {displayName}
            </Text>
            <Text style={styles.cardSpeciesRoom} numberOfLines={1}>
              {speciesName} - {roomLabel}
            </Text>

            <View style={styles.cardMetaRow}>
              <Ionicons name="calendar-outline" size={16} color={palette.text} />
              <Text style={[styles.cardMetaText, { color: palette.text }]} numberOfLines={1}>
                {getNextWateringLabel(item)}
              </Text>
            </View>

            <View style={styles.cardMetaRow}>
              <Ionicons name="refresh-outline" size={16} color={colors.textMuted} />
              <Text style={styles.cardMetaText} numberOfLines={1}>
                {frequencyLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardRightCol}>
          <StatusBadge tone={status.tone} label={status.badgeLabel} />
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={styles.cardChevron} />
        </View>
      </View>
    </Pressable>
  );
};

const EmptyPlantsState: React.FC<{ onAddPlant: () => void }> = ({ onAddPlant }) => {
  return (
    <View style={styles.emptyStateCard}>
      <View style={styles.emptyStateIllustration}>
        <View style={styles.shelfLine} />
        <Ionicons name="leaf" size={48} color="rgba(14,149,63,0.38)" />
      </View>

      <Text style={styles.emptyStateTitle}>No plants yet</Text>
      <Text style={styles.emptyStateBody}>
        Start your little indoor jungle. We'll help you remember watering, rooms, and care notes.
      </Text>

      <TouchableOpacity style={styles.emptyStateButton} onPress={onAddPlant} activeOpacity={0.86}>
        <Ionicons name="add-circle" size={18} color={colors.background} />
        <Text style={styles.emptyStateButtonText}>Add your first plant</Text>
      </TouchableOpacity>
    </View>
  );
};

const EmptySearchResultsState: React.FC = () => {
  return (
    <View style={styles.emptyResultsWrap}>
      <Text style={styles.emptyResultsTitle}>No matching plants</Text>
      <Text style={styles.emptyResultsBody}>Try a different search or filter.</Text>
    </View>
  );
};

const PlantsListScreen: React.FC<Props> = ({ navigation }) => {
  const [plants, setPlants] = React.useState<Plant[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchInput, setSearchInput] = React.useState<string>("");
  const [selectedFilter, setSelectedFilter] = React.useState<FilterKey>("all");
  const hasLoadedOnceRef = React.useRef(false);
  const insets = useSafeAreaInsets();

  const auth = useAuth();
  const { showSnackbar } = useSnackbar();

  const handleAddPlant = React.useCallback(() => {
    navigation.navigate("SelectSpecies");
  }, [navigation]);

  const handleDeletePlant = React.useCallback((plant: Plant) => {
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
                showSnackbar({
                  message: "Your session has expired. Please log in again.",
                  type: "error",
                  duration: 2000,
                });
                return;
              }

              showSnackbar({ message: "Could not delete plant. Please try again.", type: "error", duration: 2000 });
            }
          },
        },
      ],
    );
  }, [auth, showSnackbar]);

  const handleOpenPlant = React.useCallback((plant: Plant) => {
    navigation.navigate("PlantDetails", { plant });
  }, [navigation]);

  const loadPlants = React.useCallback(async (options?: { refresh?: boolean; silent?: boolean }) => {
    const isRefresh = Boolean(options?.refresh);
    const isSilent = Boolean(options?.silent);

    if (!auth.token) {
      setError("You are not signed in. Please log in again.");
      setPlants([]);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else if (!isSilent) {
      setLoading(true);
    }

    if (!isSilent) {
      setError(null);
    }

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

      if (!isSilent) {
        setError("Could not load plants. Please try again.");
        setPlants([]);
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else if (!isSilent) {
        setLoading(false);
      }
    }
  }, [auth]);

  useFocusEffect(
    React.useCallback(() => {
      if (!hasLoadedOnceRef.current) {
        hasLoadedOnceRef.current = true;
        void loadPlants();
        return;
      }

      void loadPlants({ silent: true });
    }, [loadPlants]),
  );

  const plantViewModels = React.useMemo<PlantCardVM[]>(() => {
    return plants.map((plant) => ({ plant, status: getPlantWateringStatus(plant) }));
  }, [plants]);

  const filterCounts = React.useMemo(() => {
    return plantViewModels.reduce(
      (acc, item) => {
        acc.all += 1;
        if (item.status.tone === "overdue" || item.status.tone === "setup") {
          acc.overdue += 1;
        }
        if (item.status.tone === "dueSoon") {
          acc.dueSoon += 1;
        }
        if (item.status.tone === "ok") {
          acc.ok += 1;
        }
        return acc;
      },
      { all: 0, overdue: 0, dueSoon: 0, ok: 0 },
    );
  }, [plantViewModels]);

  const filteredPlants = React.useMemo(() => {
    return plantViewModels
      .filter((item) => toneMatchesFilter(item.status.tone, selectedFilter))
      .filter((item) => matchesSearch(item.plant, searchInput))
      .map((item) => item.plant);
  }, [plantViewModels, searchInput, selectedFilter]);

  const hasPlants = plants.length > 0;
  const hasFilterResults = filteredPlants.length > 0;
  const hasOverdueWatering = React.useMemo(
    () => plantViewModels.some((item) => item.status.tone === "overdue"),
    [plantViewModels],
  );
  const hasDueTodayWatering = React.useMemo(
    () =>
      plantViewModels.some(
        (item) => item.status.tone === "dueSoon" && item.status.diffDays === 0,
      ),
    [plantViewModels],
  );
  const heroTone: HeroTone = hasOverdueWatering
    ? "overdue"
    : hasDueTodayWatering
      ? "today"
      : "calm";

  const renderHeader = React.useMemo(() => {
    return (
      <View>
        <OverviewHeroCard
          totalPlants={filterCounts.all}
          overdue={filterCounts.overdue}
          dueSoon={filterCounts.dueSoon}
          ok={filterCounts.ok}
          empty={!hasPlants}
          tone={heroTone}
          onAddPlant={handleAddPlant}
        />

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search plants..."
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
            editable={hasPlants}
          />
        </View>

        {!hasPlants ? (
          <View style={styles.searchHelperCard}>
            <Text style={styles.searchHelperText}>Add a plant to start searching.</Text>
          </View>
        ) : null}

        {hasPlants ? (
          <PlantFilterPills selected={selectedFilter} onSelect={setSelectedFilter} counts={filterCounts} />
        ) : null}
      </View>
    );
  }, [filterCounts, hasPlants, handleAddPlant, heroTone, searchInput, selectedFilter]);

  return (
    <View style={styles.container}>
      <View style={{ height: insets.top + spacing.sm }} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.centerText}>Loading plants...</Text>
        </View>
      ) : error ? (
        <View style={styles.messageCard}>
          <Text style={styles.cardTitle}>Something went wrong</Text>
          <Text style={styles.cardText}>{error}</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={() => void loadPlants()}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={hasPlants ? filteredPlants : []}
          keyExtractor={(item, index) => item.id ?? `plant-${index}`}
          renderItem={({ item }) => (
            <PlantListCard item={item} onOpen={handleOpenPlant} onDelete={handleDeletePlant} />
          )}
          refreshing={refreshing}
          onRefresh={() => void loadPlants({ refresh: true })}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            hasPlants ? (
              <EmptySearchResultsState />
            ) : (
              <EmptyPlantsState onAddPlant={handleAddPlant} />
            )
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContentContainer,
            (!hasPlants || !hasFilterResults) && styles.listContentGrow,
            { paddingBottom: insets.bottom + 120 },
          ]}
        />
      )}

      {!loading && !error ? (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 72 }]}
          onPress={handleAddPlant}
          accessibilityRole="button"
          accessibilityLabel="Add plant"
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={30} color={colors.background} />
        </TouchableOpacity>
      ) : null}
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
    padding: spacing.lg,
    boxShadow: boxShadows.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: spacing.xs,
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
    fontWeight: "700",
    color: colors.background,
  },

  listContentContainer: {
    paddingBottom: spacing.xl,
  },
  listContentGrow: {
    flexGrow: 1,
  },

  overviewHeroShell: {
    borderRadius: HERO_RADIUS,
    borderWidth: 1,
    boxShadow: boxShadows.md,
    marginBottom: spacing.md,
  },
  overviewHero: {
    borderRadius: HERO_RADIUS,
    overflow: "hidden",
    position: "relative",
    padding: spacing.lg,
  },
  heroBlobLarge: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 999,
    right: -80,
    top: -30,
    backgroundColor: "rgba(14,149,63,0.09)",
  },
  heroBlobSmall: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 999,
    right: -52,
    bottom: -85,
    backgroundColor: "rgba(14,149,63,0.12)",
  },
  overviewLabel: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  overviewPlantsCount: {
    fontSize: 27,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  overviewSupport: {
    fontSize: 15,
    marginBottom: spacing.md,
  },
  overviewStatsStrip: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  overviewStatItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewStatDot: {
    width: 9,
    height: 9,
    borderRadius: 99,
    marginBottom: spacing.xs,
  },
  overviewStatValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  overviewStatLabel: {
    fontSize: 13,
  },
  overviewDivider: {
    width: 1,
    height: "82%",
    backgroundColor: "rgba(255,255,255,0.28)",
  },

  emptyHeroContent: {
    paddingRight: spacing.xl,
  },
  emptyHeroTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  emptyHeroText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 23,
  },
  emptyHeroButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  emptyHeroButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.background,
  },
  emptyHeroArt: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    boxShadow: boxShadows.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: spacing.md,
    paddingLeft: spacing.sm,
  },
  searchHelperCard: {
    backgroundColor: "#f3f4f6",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  searchHelperText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "500",
  },

  filtersWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(11,11,11,0.12)",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterPillActive: {
    borderColor: "rgba(14,149,63,0.42)",
    backgroundColor: "#ddf4e5",
  },
  filterPillPressed: {
    opacity: 0.9,
  },
  filterPillText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  filterPillTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },

  plantCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    boxShadow: boxShadows.sm,
  },
  plantCardPressed: {
    backgroundColor: "#fafafa",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  cardMainInfoWrap: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
  },
  thumbnailWrap: {
    width: 82,
    height: 116,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: "#e6efe8",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTextWrap: {
    flex: 1,
    paddingTop: spacing.xs,
  },
  cardPlantName: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "800",
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  cardSpeciesRoom: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardMetaText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "600",
  },

  cardRightCol: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    minHeight: 104,
    paddingTop: spacing.xs,
  },
  cardChevron: {
    marginTop: spacing.md,
  },
  statusBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "800",
  },

  emptyStateCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.sm,
    padding: spacing.lg,
    alignItems: "center",
  },
  emptyStateIllustration: {
    width: "100%",
    height: 220,
    borderRadius: radius.md,
    backgroundColor: "#f7faf8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    position: "relative",
  },
  shelfLine: {
    position: "absolute",
    left: spacing.xl,
    right: spacing.xl,
    bottom: 52,
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: "#efc9a8",
  },
  emptyStateTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyStateBody: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 25,
    marginBottom: spacing.lg,
  },
  emptyStateButton: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  emptyStateButtonText: {
    fontSize: 15,
    color: colors.background,
    fontWeight: "800",
  },

  emptyResultsWrap: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.sm,
    padding: spacing.lg,
    alignItems: "center",
  },
  emptyResultsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyResultsBody: {
    fontSize: 14,
    color: colors.textMuted,
  },

  fab: {
    position: "absolute",
    right: spacing.lg,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: boxShadows.lg,
  },
});

export default PlantsListScreen;
