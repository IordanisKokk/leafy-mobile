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
import { colors, spacing, radius, boxShadows, todayTheme } from "../../theme";
import { Plant, fetchPlants, waterPlant } from "../../api/plants";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "../../context/SnackbarContext";
import WateringCan from "../../../assets/watering-can/watering-can.svg";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { MainTabParamList } from "../../navigation/MainTabNavigator";
import QuickActionsDock, { QuickAction } from "./components/QuickActionsDock";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ScheduledPlant = {
  plant: Plant;
  nextDate: Date;
  isOverdue: boolean;
};

const getPlantDisplayName = (plant: Plant) =>
  plant.name?.trim() ||
  plant.species?.commonName ||
  plant.species?.scientificName ||
  "Unnamed plant";

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

const getPlantIntervalDays = (plant: Plant) =>
  plant.wateringIntervalDays ??
  plant.wateringFrequencyDays ??
  plant.species?.defaultWateringIntervalDays ??
  plant.species?.defaultwateringFrequencyDays ??
  null;

const computeNextWateringDate = (plant: Plant) => {
  const intervalDays = getPlantIntervalDays(plant);
  if (!intervalDays || intervalDays <= 0) return null;
  if (!plant.lastWateredAt) return null;

  const last = new Date(plant.lastWateredAt);
  if (Number.isNaN(last.getTime())) return null;

  return addDays(startOfDay(last), intervalDays);
};

const TodayScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const [plants, setPlants] = React.useState<Plant[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSnoozeModalVisible, setIsSnoozeModalVisible] = React.useState(false);
  const [snoozeError, setSnoozeError] = React.useState<string | null>(null);
  const [snoozedOffsets, setSnoozedOffsets] = React.useState<Record<string, number>>({});
  const [wateringPlantIds, setWateringPlantIds] = React.useState<Record<string, boolean>>({});
  const [isBulkWaterModalVisible, setIsBulkWaterModalVisible] = React.useState(false);
  const [selectedBulkPlantIds, setSelectedBulkPlantIds] = React.useState<string[]>([]);
  const [isBulkWaterSubmitting, setIsBulkWaterSubmitting] = React.useState(false);
  const [bulkWaterError, setBulkWaterError] = React.useState<string | null>(null);

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

  useFocusEffect(
    React.useCallback(() => {
      void loadPlants();
    }, [loadPlants]),
  );

  const today = startOfDay(new Date());
  const computeNextWateringDateForPlant = (plant: Plant): Date | null => {
    const intervalDays = getPlantIntervalDays(plant);
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
  const scheduledPlants = React.useMemo<ScheduledPlant[]>(
    () =>
      plants
        .map((plant) => {
          const nextDate = computeNextWateringDateForPlant(plant);
          if (!nextDate) {
            return null;
          }

          return {
            plant,
            nextDate,
            isOverdue: nextDate < today,
          };
        })
        .filter((entry): entry is ScheduledPlant => Boolean(entry))
        .sort((left, right) => left.nextDate.getTime() - right.nextDate.getTime()),
    [plants, snoozedOffsets, today],
  );

  const dueTasks = plants.filter((plant) => {
    const intervalDays = getPlantIntervalDays(plant);
    if (!intervalDays || intervalDays <= 0) return false;
    const nextDate = computeNextWateringDateForPlant(plant);
    if (!nextDate) return true;
    return nextDate <= today;
  });

  const visibleTasks = dueTasks.slice(0, 3);
  const remainingTasks = Math.max(dueTasks.length - visibleTasks.length, 0);
  const dueTaskIds = React.useMemo(() => new Set(dueTasks.map((plant) => plant.id)), [dueTasks]);
  const sortedPlants = React.useMemo(
    () =>
      [...plants].sort((left, right) => {
        const leftIsDue = dueTaskIds.has(left.id);
        const rightIsDue = dueTaskIds.has(right.id);

        if (leftIsDue !== rightIsDue) {
          return leftIsDue ? -1 : 1;
        }

        return getPlantDisplayName(left).localeCompare(getPlantDisplayName(right));
      }),
    [dueTaskIds, plants],
  );

  const dueTodayCount = scheduledPlants.filter(({ nextDate }) => isSameDay(nextDate, today)).length;

  const overdueCount = scheduledPlants.filter(({ nextDate }) => nextDate < today).length;

  const weekStart = addDays(today, -((today.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekEnd = addDays(weekStart, 6);

  const duePlantsByWeekDay = React.useMemo(() => {
    const grouped = new Map<string, ScheduledPlant[]>();

    scheduledPlants.forEach((entry) => {
      const normalizedDueDate = entry.isOverdue ? today : entry.nextDate;
      if (normalizedDueDate < weekStart || normalizedDueDate > weekEnd) {
        return;
      }

      const key = dateKey(normalizedDueDate);
      const entries = grouped.get(key) ?? [];
      entries.push(entry);
      grouped.set(key, entries);
    });

    grouped.forEach((entries) => {
      entries.sort((left, right) => {
        if (left.isOverdue !== right.isOverdue) {
          return left.isOverdue ? -1 : 1;
        }
        return left.plant.name.localeCompare(right.plant.name);
      });
    });

    return grouped;
  }, [scheduledPlants, today, weekStart, weekEnd]);

  const heroPalette = overdueCount > 0
    ? todayTheme.hero.overdue
    : dueTasks.length > 0
      ? todayTheme.hero.due
      : todayTheme.hero.neutral;
  const heroGradientColors = heroPalette.gradient;
  const heroBubbleColors = heroPalette.bubbles;
  const heroBorderColor = heroPalette.border;
  const heroIconTint = todayTheme.hero.iconTint;
  const heroText = todayTheme.hero.text;

  const handleMarkWatered = async (plant: Plant) => {
    if (!auth.token || wateringPlantIds[plant.id]) {
      return;
    }

    setWateringPlantIds((current) => ({ ...current, [plant.id]: true }));

    try {
      const timestamp = new Date().toISOString();
      const response = await waterPlant(plant.id, timestamp, auth.token);
      const resolvedWateredAt = response.wateredAt ?? timestamp;

      setPlants((current) =>
        current.map((entry) =>
          entry.id === response.plantId
            ? { ...entry, lastWateredAt: resolvedWateredAt }
            : entry
        )
      );
      setSnoozedOffsets((current) => {
        if (!(plant.id in current)) {
          return current;
        }

        const next = { ...current };
        delete next[plant.id];
        return next;
      });

      showSnackbar({
        message: `${plant.name} marked as watered.`,
        type: "success",
        duration: 2000,
      });
    } catch (err) {
      console.error("waterPlant failed:", err);
      showSnackbar({
        message: `Could not mark ${plant.name} as watered.`,
        type: "error",
        duration: 2500,
      });
    } finally {
      setWateringPlantIds((current) => {
        const next = { ...current };
        delete next[plant.id];
        return next;
      });
    }
  };

  const handleOpenPlant = (plant: Plant) => {
    navigation.navigate("Plants", {
      initial: false,
      screen: "PlantDetails",
      params: { plant },
    });
  };

  const handleAddPlant = () => {
    navigation.navigate("Plants", { initial: false, screen: "SelectSpecies" });
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

  const openBulkWaterModal = () => {
    if (plants.length === 0) {
      return;
    }
    setBulkWaterError(null);
    setSelectedBulkPlantIds([]);
    setIsBulkWaterModalVisible(true);
  };

  const closeBulkWaterModal = () => {
    if (isBulkWaterSubmitting) {
      return;
    }
    setIsBulkWaterModalVisible(false);
    setBulkWaterError(null);
  };

  const toggleBulkPlantSelection = (plantId: string) => {
    if (isBulkWaterSubmitting) {
      return;
    }

    setSelectedBulkPlantIds((current) =>
      current.includes(plantId)
        ? current.filter((id) => id !== plantId)
        : [...current, plantId],
    );
  };

  const handleBulkWater = async () => {
    if (!auth.token || isBulkWaterSubmitting) {
      return;
    }

    if (selectedBulkPlantIds.length === 0) {
      setBulkWaterError("Select at least one plant to continue.");
      return;
    }

    setIsBulkWaterSubmitting(true);
    setBulkWaterError(null);

    const wateredAt = new Date().toISOString();
    const succeededWaterings = new Map<string, string>();
    const failedPlantNames: string[] = [];

    try {
      for (const plantId of selectedBulkPlantIds) {
        const plant = plants.find((entry) => entry.id === plantId);
        if (!plant) {
          continue;
        }

        try {
          const response = await waterPlant(plantId, wateredAt, auth.token);
          succeededWaterings.set(response.plantId, response.wateredAt ?? wateredAt);
        } catch (error) {
          console.error("bulk waterPlant failed:", error);
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes("401") || message.includes("403")) {
            auth.logout?.();
            setBulkWaterError("Your session expired. Please sign in again.");
            return;
          }
          failedPlantNames.push(getPlantDisplayName(plant));
        }
      }

      if (succeededWaterings.size > 0) {
        setPlants((current) =>
          current.map((entry) =>
            succeededWaterings.has(entry.id)
              ? { ...entry, lastWateredAt: succeededWaterings.get(entry.id) ?? wateredAt }
              : entry,
          ),
        );
        setSnoozedOffsets((current) => {
          const next = { ...current };
          succeededWaterings.forEach((_, plantId) => {
            delete next[plantId];
          });
          return next;
        });
      }

      if (failedPlantNames.length === 0) {
        setIsBulkWaterModalVisible(false);
        setSelectedBulkPlantIds([]);
        showSnackbar({
          message: `Watered ${succeededWaterings.size} plant${succeededWaterings.size === 1 ? "" : "s"}.`,
          type: "success",
          duration: 2200,
        });
        return;
      }

      if (succeededWaterings.size > 0) {
        setIsBulkWaterModalVisible(false);
        setSelectedBulkPlantIds([]);
        showSnackbar({
          message: `Watered ${succeededWaterings.size} plant${succeededWaterings.size === 1 ? "" : "s"}. ${failedPlantNames.length} failed.`,
          type: "info",
          duration: 3000,
        });
        return;
      }

      setBulkWaterError("Could not water the selected plants. Please try again.");
    } finally {
      setIsBulkWaterSubmitting(false);
    }
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
      onPress: openBulkWaterModal,
      disabled: plants.length === 0,
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
      <View style={{ height: insets.top + spacing.sm }} />
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

            {dueTasks.length === 0 ? (
              <View style={styles.taskEmptyState}>
                <Text style={styles.taskEmptyTitle}>No plants need to be watered today!</Text>
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
                  const isWatering = Boolean(wateringPlantIds[plant.id]);

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
                            void handleMarkWatered(plant);
                          }}
                          style={({ pressed }) => [
                            styles.taskQuickAction,
                            (pressed || isWatering) && styles.taskQuickActionActive,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Mark ${plant.name} watered`}
                          disabled={isWatering}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          {({ pressed }) =>
                            isWatering ? (
                              <ActivityIndicator size="small" color={colors.background} />
                            ) : (
                              <Ionicons
                                name="water-outline"
                                size={16}
                                color={pressed ? colors.background : colors.primary}
                              />
                            )
                          }
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
                    <Ionicons name="water-outline" size={16} color={colors.surface} />
                    <Text style={styles.moreTasksText}>
                      +{remainingTasks} more plants to water
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.surface} />
                  </TouchableOpacity>
                )}
              </View>
            )}

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>This week</Text>
            </View>
            <View style={styles.weekRow}>
              {weekDays.map((day) => {
                const key = dateKey(day);
                const isToday = isSameDay(day, today);
                const entries = duePlantsByWeekDay.get(key) ?? [];
                const hasWatering = entries.length > 0;
                return (
                  <View
                    key={key}
                    style={[
                      styles.weekDay,
                      isToday && styles.weekDayToday,
                      hasWatering && styles.weekDayScheduled,
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
                    <View style={styles.weekDotsRow}>
                      {Array.from({ length: Math.min(entries.length, 3) }, (_, index) => (
                        <View
                          key={`${key}-dot-${index}`}
                          style={[
                            styles.weekDot,
                            hasWatering && styles.weekDotActive,
                            isToday && styles.weekDotActiveToday,
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <QuickActionsDock actions={dockActions} overflowAction={overflowAction} />
        </ScrollView>
      )}

      <Modal
        visible={isBulkWaterModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeBulkWaterModal}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeBulkWaterModal}>
          <Pressable style={styles.sheetCard} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Bulk water</Text>
                <Text style={styles.sheetSubtitle}>Select the plants you want to mark as watered</Text>
              </View>
              <TouchableOpacity
                style={styles.sheetClose}
                onPress={closeBulkWaterModal}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Close"
                disabled={isBulkWaterSubmitting}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.bulkList} contentContainerStyle={styles.bulkListContent}>
              {sortedPlants.map((plant) => {
                const isSelected = selectedBulkPlantIds.includes(plant.id);
                const locationLabel = [plant.room, plant.location].filter(Boolean).join(" · ");
                const nextDate = computeNextWateringDateForPlant(plant);
                const isOverdue = nextDate ? nextDate < today : false;
                const isDueToday = nextDate ? isSameDay(nextDate, today) : false;
                const rowTone = isOverdue ? "overdue" : isDueToday || dueTaskIds.has(plant.id) ? "due" : "normal";

                return (
                  <Pressable
                    key={plant.id}
                    onPress={() => toggleBulkPlantSelection(plant.id)}
                    style={({ pressed }) => [
                      styles.bulkRow,
                      rowTone === "overdue" && styles.bulkRowOverdue,
                      rowTone === "due" && styles.bulkRowDue,
                      isSelected && styles.bulkRowSelected,
                      pressed && styles.bulkRowPressed,
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    disabled={isBulkWaterSubmitting}
                  >
                    <View style={styles.bulkRowText}>
                      <View style={styles.bulkRowTopLine}>
                        <View style={styles.bulkTitleWrap}>
                          <View
                            style={[
                              styles.bulkStatusDot,
                              rowTone === "overdue" && styles.bulkStatusDotOverdue,
                              rowTone === "due" && styles.bulkStatusDotDue,
                            ]}
                          />
                          <Text style={styles.bulkRowTitle} numberOfLines={1}>
                            {getPlantDisplayName(plant)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.bulkRowSubtitle} numberOfLines={1}>
                        {locationLabel || plant.species?.commonName || "No room set"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.bulkSelectionMark,
                        !isSelected && rowTone === "overdue" && styles.bulkSelectionMarkOverdue,
                        !isSelected && rowTone === "due" && styles.bulkSelectionMarkDue,
                        isSelected && rowTone === "overdue" && styles.bulkSelectionMarkSelectedOverdue,
                        isSelected && rowTone === "due" && styles.bulkSelectionMarkSelectedDue,
                        isSelected && rowTone === "normal" && styles.bulkSelectionMarkSelectedNeutral,
                      ]}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>

            {bulkWaterError ? <Text style={styles.sheetError}>{bulkWaterError}</Text> : null}

            <View style={styles.bulkFooter}>
              <TouchableOpacity
                style={styles.bulkCancelButton}
                onPress={closeBulkWaterModal}
                activeOpacity={0.85}
                disabled={isBulkWaterSubmitting}
              >
                <Text style={styles.bulkCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.bulkConfirmButton,
                  (selectedBulkPlantIds.length === 0 || isBulkWaterSubmitting) && styles.bulkConfirmButtonDisabled,
                ]}
                onPress={() => void handleBulkWater()}
                activeOpacity={0.85}
                disabled={selectedBulkPlantIds.length === 0 || isBulkWaterSubmitting}
              >
                {isBulkWaterSubmitting ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.bulkConfirmButtonText}>
                    Water {selectedBulkPlantIds.length > 0 ? `(${selectedBulkPlantIds.length})` : ""}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
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
    marginVertical: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    justifyContent: "center",
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
    marginBottom: spacing.md,
  },
  moreTasksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
  },
  moreTasksText: {
    fontSize: 12,
    color: colors.surface,
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
  bulkList: {
    marginTop: spacing.lg,
    maxHeight: 380,
  },
  bulkListContent: {
    gap: spacing.sm,
  },
  bulkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#dfe7e1",
    backgroundColor: "#fbfcfb",
  },
  bulkRowOverdue: {
    borderColor: "#f3d2d2",
    backgroundColor: "#fff8f8",
  },
  bulkRowDue: {
    borderColor: "#d7e9dc",
    backgroundColor: "#f7fcf8",
  },
  bulkRowPressed: {
    backgroundColor: "#f4f7f4",
  },
  bulkRowSelected: {
    backgroundColor: "#edf7f0",
    boxShadow: boxShadows.sm,
  },
  bulkRowText: {
    flex: 1,
  },
  bulkRowTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  bulkTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  bulkRowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  bulkRowSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
  },
  bulkStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#cfd9d1",
  },
  bulkStatusDotDue: {
    backgroundColor: colors.primary,
  },
  bulkStatusDotOverdue: {
    backgroundColor: colors.error,
  },
  bulkSelectionMark: {
    width: 10,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: "#e6ece7",
    alignSelf: "center",
  },
  bulkSelectionMarkDue: {
    backgroundColor: "#cfe8d6",
  },
  bulkSelectionMarkOverdue: {
    backgroundColor: "#f0c9c9",
  },
  bulkSelectionMarkSelectedOverdue: {
    backgroundColor: colors.error,
  },
  bulkSelectionMarkSelectedDue: {
    backgroundColor: colors.primary,
  },
  bulkSelectionMarkSelectedNeutral: {
    backgroundColor: "#7aa98a",
  },
  bulkFooter: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  bulkCancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  bulkCancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  bulkConfirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  bulkConfirmButtonDisabled: {
    opacity: 0.5,
  },
  bulkConfirmButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.background,
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
    marginTop: 0,
    marginHorizontal: -2,
  },
  weekDay: {
    flex: 1,
    minHeight: 74,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "#f6f8f6",
    alignItems: "center",
    marginHorizontal: 2,
    justifyContent: "center",
  },
  weekDayToday: {
    borderWidth: 1,
    borderColor: "#cfe0d3",
  },
  weekDayScheduled: {
    backgroundColor: "#eef7f0",
  },
  weekDayLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },
  weekDayNumber: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  weekDayLabelToday: {
    color: colors.text,
  },
  weekDotsRow: {
    minHeight: 10,
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  weekDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "transparent",
  },
  weekDotActive: {
    backgroundColor: colors.primary,
  },
  weekDotActiveToday: {
    backgroundColor: colors.primary,
  },
});

export default TodayScreen;
