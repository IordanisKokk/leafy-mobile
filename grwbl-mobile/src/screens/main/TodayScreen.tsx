import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
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
  const dueTasks = plants.filter((plant) => {
    const intervalDays = plant.wateringIntervalDays ?? plant.wateringFrequencyDays;
    if (!intervalDays || intervalDays <= 0) return false;
    const nextDate = computeNextWateringDate(plant);
    if (!nextDate) return true;
    return nextDate <= today;
  });

  const visibleTasks = dueTasks.slice(0, 3);
  const remainingTasks = Math.max(dueTasks.length - visibleTasks.length, 0);

  const dueTodayCount = plants.filter((plant) => {
    const nextDate = computeNextWateringDate(plant);
    return nextDate ? isSameDay(nextDate, today) : false;
  }).length;

  const overdueCount = plants.filter((plant) => {
    const nextDate = computeNextWateringDate(plant);
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

  const heroAccent = overdueCount > 0 ? colors.error : colors.primary;
  const heroPalette = overdueCount > 0
    ? todayTheme.hero.overdue
    : dueTodayCount > 0
      ? todayTheme.hero.due
      : todayTheme.hero.neutral;
  const heroGradientColors = heroPalette.gradient;
  const heroBubbleColors = heroPalette.bubbles;
  const heroBorderColor = heroPalette.border;
  const heroIconTint = todayTheme.hero.iconTint;
  const heroText = todayTheme.hero.text;
  const summaryGradientColors = ["#2cc263", "#0e953f"];
  const summaryStatGradients = {
    due: ["#fbbf24", "#f97316"],
    overdue: ["#fb7185", "#ef4444"],
    total: ["#60a5fa", "#38bdf8"],
  };

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
                <View style={[styles.heroCountPill, { backgroundColor: heroAccent }]}>
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

            {dueTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Nothing needs water</Text>
                <Text style={styles.emptyText}>Enjoy the calm — check in tomorrow.</Text>
              </View>
            ) : (
              <View style={styles.taskList}>
                {visibleTasks.map((plant) => {
                  const nextDate = computeNextWateringDate(plant);
                  const isOverdue = nextDate ? nextDate < today : false;
                  const taskLabel = nextDate
                    ? isSameDay(nextDate, today)
                      ? "Due today"
                      : "Overdue"
                    : "Needs last watered";

                  return (
                    <TouchableOpacity
                      key={plant.id}
                      style={styles.taskRow}
                      onPress={() => handleOpenPlant(plant)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.taskInfo}>
                        <Text style={styles.taskName} numberOfLines={1}>
                          {plant.name}
                        </Text>
                        <View style={styles.taskMetaRow}>
                          <View
                            style={[
                              styles.taskStatus,
                              isOverdue
                                ? styles.taskStatusOverdue
                                : styles.taskStatusDue,
                            ]}
                          >
                            <Text
                              style={[
                                styles.taskStatusText,
                                isOverdue
                                  ? styles.taskStatusTextOverdue
                                  : styles.taskStatusTextDue,
                              ]}
                            >
                              {taskLabel}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.taskActions}>
                        <TouchableOpacity
                          style={styles.taskButton}
                          onPress={(event) => {
                            event.stopPropagation();
                            handleMarkWatered(plant);
                          }}
                        >
                          <Text style={styles.taskButtonText}>Mark watered</Text>
                        </TouchableOpacity>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={colors.textMuted}
                        />
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
                    <Text style={styles.moreTasksText}>
                      +{remainingTasks} more plants to water
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </LinearGradient>

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

          <LinearGradient
            colors={summaryGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.sectionCard, styles.summaryCard]}
          >
            <View style={styles.summaryBubbleLarge} />
            <View style={styles.summaryBubbleOverlap} />
            <View style={styles.summaryBubbleMid} />
            <View style={styles.summaryBubbleSmall} />
            <View style={styles.summaryContent}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, styles.summaryTitle]}>Summary</Text>
                <Ionicons name="analytics-outline" size={18} color={colors.background} />
              </View>
              <View style={styles.statsRow}>
                <LinearGradient
                  colors={summaryStatGradients.due}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.statCard, styles.summaryStatCard]}
                >
                  <View style={[styles.summaryStatIconWrap, styles.summaryStatIconDue]}>
                    <Ionicons name="calendar" size={16} color={colors.background} />
                  </View>
                  <Text style={styles.statValue}>{dueTodayCount}</Text>
                  <Text style={styles.statLabel}>Due today</Text>
                </LinearGradient>
                <LinearGradient
                  colors={summaryStatGradients.overdue}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.statCard, styles.summaryStatCard]}
                >
                  <View style={[styles.summaryStatIconWrap, styles.summaryStatIconOverdue]}>
                    <Ionicons name="alert" size={16} color={colors.background} />
                  </View>
                  <Text style={styles.statValue}>{overdueCount}</Text>
                  <Text style={styles.statLabel}>Overdue</Text>
                </LinearGradient>
                <LinearGradient
                  colors={summaryStatGradients.total}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.statCard, styles.summaryStatCard]}
                >
                  <View style={[styles.summaryStatIconWrap, styles.summaryStatIconTotal]}>
                    <Ionicons name="leaf" size={16} color={colors.background} />
                  </View>
                  <Text style={styles.statValue}>{plants.length}</Text>
                  <Text style={styles.statLabel}>Total plants</Text>
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>
        </ScrollView>
      )}
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
    backgroundColor: colors.primary,
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
  summaryCard: {
    backgroundColor: "transparent",
    borderWidth: 0,
    overflow: "hidden",
  },
  summaryContent: {
    position: "relative",
    zIndex: 1,
  },
  summaryBubbleLarge: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.18)",
    top: -32,
    right: -24,
  },
  summaryBubbleOverlap: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.14)",
    top: 10,
    right: 28,
  },
  summaryBubbleMid: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.14)",
    top: 40,
    right: 24,
  },
  summaryBubbleSmall: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.12)",
    bottom: -16,
    left: 20,
  },
  summaryTitle: {
    color: colors.background,
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
  emptyState: {
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: todayTheme.hero.text.primary,
  },
  emptyText: {
    fontSize: 13,
    color: todayTheme.hero.text.secondary,
  },
  taskList: {
    gap: spacing.sm,
  },
  moreTasksRow: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  moreTasksText: {
    fontSize: 12,
    color: todayTheme.hero.text.muted,
    fontWeight: "600",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    boxShadow: boxShadows.sm,
    zIndex: 2,
  },
  taskInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  taskName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  taskMeta: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textMuted,
  },
  taskMetaRow: {
    marginTop: spacing.xs,
    flexDirection: "row",
  },
  taskStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  taskStatusDue: {
    backgroundColor: todayTheme.taskStatus.dueBackground,
  },
  taskStatusOverdue: {
    backgroundColor: todayTheme.taskStatus.overdueBackground,
  },
  taskStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  taskStatusTextDue: {
    color: colors.primary,
  },
  taskStatusTextOverdue: {
    color: colors.error,
  },
  taskActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  taskButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  taskButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.background,
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
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  summaryStatCard: {
    borderColor: "rgba(255,255,255,0.35)",
  },
  summaryStatIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  summaryStatIconDue: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  summaryStatIconOverdue: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  summaryStatIconTotal: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.background,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: colors.background,
  },
});

export default TodayScreen;
