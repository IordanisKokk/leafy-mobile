import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Header from "../../components/Header";
import { colors, spacing, radius, boxShadows, todayTheme } from "../../theme";
import { Plant, fetchPlants } from "../../api/plants";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "../../context/SnackbarContext";
import WateringCan from "../../../assets/watering-can/watering-can.svg";
import { useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { MainTabParamList } from "../../navigation/MainTabNavigator";
import QuickActionsDock, { QuickAction } from "./components/QuickActionsDock";

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const isSameDay = (left: Date, right: Date) =>
  startOfDay(left).getTime() === startOfDay(right).getTime();

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const computeNextWateringDate = (plant: Plant) => {
  const intervalDays = plant.wateringIntervalDays ?? plant.wateringFrequencyDays;
  if (!intervalDays || intervalDays <= 0) return null;
  if (!plant.lastWateredAt) return null;

  const last = new Date(plant.lastWateredAt);
  if (Number.isNaN(last.getTime())) return null;

  return addDays(startOfDay(last), intervalDays);
};

const TodayScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const [plants, setPlants] = React.useState<Plant[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSnoozeModalVisible, setIsSnoozeModalVisible] = React.useState(false);
  const [snoozeError, setSnoozeError] = React.useState<string | null>(null);
  const [snoozedOffsets, setSnoozedOffsets] = React.useState<Record<string, number>>({});

  const auth = useAuth();
  const { showSnackbar } = useSnackbar();

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
      setError("Could not load today’s tasks. Please try again.");
      setPlants([]);
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  React.useEffect(() => {
    void loadPlants();
  }, [loadPlants]);

  const today = startOfDay(new Date());
  const computeNextWateringDateForPlant = (plant: Plant): Date | null => {
    const intervalDays = plant.wateringIntervalDays ?? plant.wateringFrequencyDays;
    if (!intervalDays || intervalDays <= 0) return null;

    const baseNextDate = computeNextWateringDate(plant);
    const offsetDays = snoozedOffsets[plant.id] ?? 0;

    if (baseNextDate) {
      return offsetDays > 0 ? addDays(baseNextDate, offsetDays) : baseNextDate;
    }

    if (offsetDays > 0) {
      return addDays(today, offsetDays);
    }

    return null;
  };
  const dueTasks = plants.filter((plant) => {
    const intervalDays = plant.wateringIntervalDays ?? plant.wateringFrequencyDays;
    if (!intervalDays || intervalDays <= 0) return false;
    const nextDate = computeNextWateringDateForPlant(plant);
    if (!nextDate) return true;
    return nextDate <= today;
  });

  const visibleTasks = dueTasks.slice(0, 3);
  const remainingTasks = Math.max(dueTasks.length - visibleTasks.length, 0);

  const dueTodayCount = plants.filter((plant) => {
    const nextDate = computeNextWateringDateForPlant(plant);
    return nextDate ? isSameDay(nextDate, today) : false;
  }).length;

  const overdueCount = plants.filter((plant) => {
    const nextDate = computeNextWateringDateForPlant(plant);
    return nextDate ? nextDate < today : false;
  }).length;

  const wateredDates = new Set(
    plants
      .map((plant) => (plant.lastWateredAt ? new Date(plant.lastWateredAt) : null))
      .filter((date): date is Date => Boolean(date))
      .map((date) => dateKey(startOfDay(date)))
  );

  const weekStart = addDays(today, -((today.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const wateringStreakDays = (() => {
    if (wateredDates.size === 0) return 0;
    let streak = 0;
    let cursor = today;
    while (true) {
      const key = dateKey(cursor);
      if (!wateredDates.has(key)) {
        break;
      }
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    return streak;
  })();

  const heroPalette = todayTheme.hero.neutral;
  const heroGradientColors = heroPalette.gradient;
  const heroBubbleColors = heroPalette.bubbles;
  const heroBorderColor = heroPalette.border;
  const heroIconTint = todayTheme.hero.iconTint;
  const heroText = todayTheme.hero.text;

  const handleMarkWatered = (plant: Plant) => {
    console.log("Mark watered pressed for:", plant.id);
    showSnackbar({
      message: `Marked ${plant.name} as watered (placeholder)`,
      type: "info",
      duration: 2000,
    });
  };

  const handleOpenPlant = (plant: Plant) => {
    navigation.navigate("Plants", {
      screen: "PlantDetails",
      params: { plant },
    });
  };

  const handleAddPlant = () => {
    navigation.navigate("Plants", { screen: "SelectSpecies" });
  };

  const handleOpenReminders = () => {
    navigation.navigate("Settings");
  };

  const handleOverflowActions = () => {
    Alert.alert("More actions", "Choose an action", [
      { text: "Reminders", onPress: handleOpenReminders },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleBulkWater = () => {
    showSnackbar({
      message: "Bulk watering mode coming soon.",
      type: "info",
      duration: 2000,
    });
  };

  const openSnoozeModal = () => {
    if (dueTasks.length === 0) {
      return;
    }
    setSnoozeError(null);
    setIsSnoozeModalVisible(true);
  };

  const closeSnoozeModal = () => {
    setIsSnoozeModalVisible(false);
  };

  const formatSnoozeDate = (date: Date) =>
    date.toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });

  const applySnooze = (days: number) => {
    if (dueTasks.length === 0) {
      return;
    }

    try {
      setSnoozeError(null);
      const previousOffsets = { ...snoozedOffsets };
      const nextOffsets = { ...snoozedOffsets };

      dueTasks.forEach((plant) => {
        nextOffsets[plant.id] = (nextOffsets[plant.id] ?? 0) + days;
      });

      setSnoozedOffsets(nextOffsets);
      setIsSnoozeModalVisible(false);

      const snoozeUntil = addDays(today, days);
      showSnackbar({
        message: `Snoozed until ${formatSnoozeDate(snoozeUntil)}`,
        type: "success",
        duration: 7000,
        actionLabel: "Undo",
        onAction: () => {
          setSnoozedOffsets(previousOffsets);
          showSnackbar({
            message: "Snooze undone",
            type: "info",
            duration: 2000,
          });
        },
      });
    } catch (err) {
      console.error("snooze failed:", err);
      setSnoozeError("Couldn’t snooze tasks. Try again.");
    }
  };

  const hasDueTasks = dueTasks.length > 0;
  const dockActions: QuickAction[] = [
    {
      id: "add-plant",
      label: "Add plant",
      icon: "add-circle-outline",
      onPress: handleAddPlant,
    },
    {
      id: "bulk-water",
      label: "Bulk water",
      icon: "checkmark-done-outline",
      onPress: handleBulkWater,
      disabled: !hasDueTasks,
    },
    {
      id: "snooze",
      label: "Snooze",
      icon: "time-outline",
      onPress: openSnoozeModal,
      disabled: !hasDueTasks,
    },
    {
      id: "reminders",
      label: "Reminders",
      icon: "notifications-outline",
      onPress: handleOpenReminders,
    },
  ];
  const overflowAction: QuickAction = {
    id: "more",
    label: "More",
    icon: "ellipsis-horizontal",
    onPress: handleOverflowActions,
  };

  return (
    <View style={styles.container}>
      <Header title="Today" showBackButton={false} showLogo={true} hide={false} />

      <Text style={styles.subtitle}>Your plant tasks for today.</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.centerText}>Loading tasks…</Text>
        </View>
      ) : error ? (
        <View style={styles.messageCard}>
          <Text style={styles.cardTitle}>Something went wrong</Text>
          <Text style={styles.cardText}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={loadPlants}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={heroGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { borderColor: heroBorderColor }]}
          >
            <View style={styles.heroHeader}>
              <View style={styles.heroTitleRow}>
                <Text style={styles.heroTitle}>Water today</Text>
                <View style={styles.heroCountPill}>
                  <Text style={styles.heroCount}>{dueTasks.length}</Text>
                </View>
              </View>
              <Text style={styles.heroSubtitle}>
                {dueTasks.length === 0
                  ? "All caught up for today"
                  : `${dueTasks.length} plants need water`}
              </Text>
              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaItem}>
                  <Ionicons name="calendar-outline" size={14} color={heroText.muted} />
                  <Text style={styles.heroMetaText}>{dueTodayCount} due today</Text>
                </View>
                <View style={styles.heroMetaItem}>
                  <Ionicons name="alert-circle-outline" size={14} color={heroText.muted} />
                  <Text style={styles.heroMetaText}>{overdueCount} overdue</Text>
                </View>
              </View>
            </View>
            <View style={styles.heroArt}>
              <View
                style={[styles.heroBubbleLarge, { backgroundColor: heroBubbleColors[0] }]}
              />
              <View
                style={[styles.heroBubbleMid, { backgroundColor: heroBubbleColors[1] }]}
              />
              <View
                style={[styles.heroBubbleSmall, { backgroundColor: heroBubbleColors[2] }]}
              />
              <WateringCan width={96} height={96} fill={heroIconTint} style={styles.heroIcon} />
            </View>

          </LinearGradient>

          <View style={styles.taskSectionCard}>
            <View style={styles.taskSectionHeader}>
              <Text style={styles.taskSectionTitle}>Plants to water</Text>
              <Text style={styles.taskSectionCount}>{dueTasks.length}</Text>
            </View>
            {dueTasks.length === 0 ? (
              <View style={styles.taskEmptyState}>
                <Text style={styles.taskEmptyTitle}>Nothing needs water</Text>
                <Text style={styles.taskEmptyText}>Enjoy the calm — check in tomorrow.</Text>
              </View>
            ) : (
              <View style={styles.taskList}>
                {visibleTasks.map((plant, index) => {
                  const nextDate = computeNextWateringDateForPlant(plant);
                  const isOverdue = nextDate ? nextDate < today : false;
                  const isDueToday = nextDate ? isSameDay(nextDate, today) : false;
                  const taskLabel = nextDate
                    ? isDueToday
                      ? "Due today"
                      : "Overdue"
                    : "Needs last watered";
                  const statusColor = nextDate
                    ? isOverdue
                      ? colors.error
                      : "#f59e0b"
                    : colors.textMuted;
                  const locationLabel = [plant.room, plant.location]
                    .filter(Boolean)
                    .join(" · ");
                  const secondaryLabel =
                    locationLabel ||
                    plant.species?.commonName ||
                    plant.species?.scientificName ||
                    "Unknown location";
                  const isLastRow = index === visibleTasks.length - 1 && remainingTasks === 0;

                  return (
                    <TouchableOpacity
                      key={plant.id}
                      style={[
                        styles.taskRow,
                        { borderLeftColor: statusColor },
                        isLastRow && styles.taskRowLast,
                      ]}
                      onPress={() => handleOpenPlant(plant)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.taskInfo}>
                        <Text style={styles.taskName} numberOfLines={2}>
                          {plant.name}
                        </Text>
                        <Text style={styles.taskSubtitle} numberOfLines={1}>
                          {secondaryLabel}
                        </Text>
                        <View style={styles.taskMetaRow}>
                          <View
                            style={[styles.taskStatusDot, { backgroundColor: statusColor }]}
                          />
                          <Text style={[styles.taskStatusText, { color: statusColor }]}>
                            {taskLabel}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.taskActions}>
                        <Pressable
                          onPress={(event) => {
                            event.stopPropagation();
                            handleMarkWatered(plant);
                          }}
                          style={({ pressed }) => [
                            styles.taskQuickAction,
                            pressed && styles.taskQuickActionActive,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Mark ${plant.name} watered`}
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
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {remainingTasks > 0 && (
                  <TouchableOpacity
                    style={styles.moreTasksRow}
                    onPress={() =>
                      navigation.navigate("Plants", { screen: "PlantsList" })
                    }
                    accessibilityRole="button"
                  >
                    <Ionicons name="water-outline" size={16} color={colors.primary} />
                    <Text style={styles.moreTasksText}>
                      +{remainingTasks} more plants to water
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>This week</Text>
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={14} color={colors.primary} />
                <Text style={styles.streakText}>{wateringStreakDays} day streak</Text>
              </View>
            </View>
            <View style={styles.weekRow}>
              {weekDays.map((day) => {
                const key = dateKey(day);
                const isToday = isSameDay(day, today);
                const hasWatering = wateredDates.has(key);
                return (
                  <View
                    key={key}
                    style={[
                      styles.weekDay,
                      isToday && styles.weekDayToday,
                      hasWatering && styles.weekDayWatered,
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekDayLabel,
                        isToday && styles.weekDayLabelToday,
                      ]}
                    >
                      {day.toLocaleDateString(undefined, { weekday: "short" })}
                    </Text>
                    <Text
                      style={[
                        styles.weekDayNumber,
                        isToday && styles.weekDayLabelToday,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                    <View
                      style={[
                        styles.weekDot,
                        hasWatering && styles.weekDotActive,
                        isToday && styles.weekDotActiveToday,
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          <QuickActionsDock actions={dockActions} overflowAction={overflowAction} />
        </ScrollView>
      )}

      <Modal
        visible={isSnoozeModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeSnoozeModal}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeSnoozeModal}>
          <Pressable style={styles.sheetCard} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Snooze watering</Text>
                <Text style={styles.sheetSubtitle}>Postpone all tasks due today</Text>
              </View>
              <TouchableOpacity
                style={styles.sheetClose}
                onPress={closeSnoozeModal}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.sheetList}>
              <Pressable
                onPress={() => applySnooze(1)}
                style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
              >
                <Text style={styles.sheetRowLabel}>Tomorrow</Text>
              </Pressable>
              <View style={styles.sheetDivider} />
              <Pressable
                onPress={() => applySnooze(2)}
                style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
              >
                <Text style={styles.sheetRowLabel}>In 2 days</Text>
              </Pressable>
            </View>
            {snoozeError ? (
              <Text style={styles.sheetError}>{snoozeError}</Text>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
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
    marginHorizontal: spacing.md,
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
  heroCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  heroHeader: {
    marginBottom: spacing.md,
    paddingRight: 160,
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: todayTheme.hero.text.primary,
  },
  heroCountPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  heroCount: {
    color: todayTheme.hero.text.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  heroSubtitle: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: todayTheme.hero.text.secondary,
  },
  heroMetaRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  heroMetaText: {
    fontSize: 12,
    color: todayTheme.hero.text.muted,
    fontWeight: "600",
  },
  heroArt: {
    position: "absolute",
    right: -32,
    top: -24,
    width: 220,
    height: 190,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  heroBubbleLarge: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    top: -8,
    right: 6,
  },
  heroBubbleMid: {
    position: "absolute",
    width: 112,
    height: 112,
    borderRadius: 56,
    top: 58,
    right: 28,
  },
  heroBubbleSmall: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    top: 90,
    left: 10,
  },
  heroIcon: {
    position: "absolute",
    right: 76,
    top: 53,
    transform: [{ rotate: "-12deg" }],
    zIndex: 1,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.sm,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: todayTheme.streak.background,
  },
  streakText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "700",
  },
  taskSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.sm,
    marginBottom: spacing.md,
  },
  taskSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  taskSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  taskSectionCount: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  taskEmptyState: {
    gap: spacing.xs,
  },
  taskEmptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  taskEmptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  taskList: {
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  moreTasksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceSoft,
  },
  moreTasksText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 3,
  },
  taskRowLast: {
    borderBottomWidth: 0,
  },
  taskInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  taskName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 20,
  },
  taskSubtitle: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textMuted,
  },
  taskMetaRow: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  taskStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  taskStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  taskActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: 2,
  },
  taskQuickAction: {
    minWidth: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    overflow: "hidden",
  },
  taskQuickActionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: `${colors.text}73`,
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.lg,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.text,
  },
  sheetSubtitle: {
    marginTop: spacing.xs,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  sheetClose: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  sheetList: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sheetRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    justifyContent: "center",
  },
  sheetRowPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  sheetRowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  sheetError: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.error,
    fontWeight: "600",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  weekDay: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    marginHorizontal: 2,
  },
  weekDayToday: {
    backgroundColor: colors.primary,
  },
  weekDayWatered: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  weekDayLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  weekDayNumber: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  weekDayLabelToday: {
    color: colors.background,
  },
  weekDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: spacing.xs,
    backgroundColor: "transparent",
  },
  weekDotActive: {
    backgroundColor: colors.primary,
  },
  weekDotActiveToday: {
    backgroundColor: colors.background,
  },
});

export default TodayScreen;
