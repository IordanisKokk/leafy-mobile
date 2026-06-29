import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlantsStackParamList } from "../../navigation/PlantsStackNavigator";
import { boxShadows, colors, radius, spacing, todayTheme } from "../../theme";
import { useSnackbar } from "../../context/SnackbarContext";
import { useAuth } from "../../context/AuthContext";
import {
  Plant,
  PlantUpdate,
  WateringHistoryEntry,
  deletePlant,
  fetchWateringHistory,
  updatePlant,
  waterPlant,
} from "../../api/plants";
import PlantEditModal, { EditDraft } from "./components/PlantEditModal";
import FormField from "../../components/FormField";

type Props = NativeStackScreenProps<PlantsStackParamList, "PlantDetails">;
const DAY_MS = 24 * 60 * 60 * 1000;
const HERO_RADIUS = 22;
type SpeciesChipKey = "light" | "water" | "toxicity";
const SPECIES_CHIP_COLLAPSED_SIZE = 36;
const SPECIES_CHIP_MAX_WIDTH = 280;
const SPECIES_CHIP_MIN_EXPANDED_WIDTH = 124;

type ExpandableSpeciesChipProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  textColor: string;
  chipStyle: object;
  isActive: boolean;
  onPress: () => void;
};

const ExpandableSpeciesChip: React.FC<ExpandableSpeciesChipProps> = ({
  icon,
  label,
  textColor,
  chipStyle,
  isActive,
  onPress,
}) => {
  const progress = React.useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const [labelWidth, setLabelWidth] = React.useState(0);

  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: isActive ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isActive, progress]);

  const expandedWidth = Math.min(
    SPECIES_CHIP_MAX_WIDTH,
    Math.max(SPECIES_CHIP_MIN_EXPANDED_WIDTH, labelWidth + 54),
  );

  const animatedWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SPECIES_CHIP_COLLAPSED_SIZE, expandedWidth],
  });

  const labelOpacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const labelTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 0],
  });

  return (
    <Pressable onPress={onPress} style={styles.speciesTagPressable}>
      <Animated.View style={[styles.speciesTag, chipStyle, styles.speciesTagAnimatedWrap, { width: animatedWidth }]}>
        <Ionicons name={icon} size={16} color={textColor} />
        <Animated.Text
          numberOfLines={1}
          style={[
            styles.speciesTagText,
            {
              color: textColor,
              opacity: labelOpacity,
              transform: [{ translateX: labelTranslateX }],
            },
          ]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
      <Text
        onLayout={(event) => setLabelWidth(event.nativeEvent.layout.width)}
        style={styles.speciesTagMeasure}
      >
        {label}
      </Text>
    </Pressable>
  );
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

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateInput(value?: string | null): string {
  if (!value) return "";
  const existingDisplay = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (existingDisplay) {
    return value;
  }
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
  }

  const parsed = parseDate(value);
  if (!parsed) return value;
  return `${padDatePart(parsed.getDate())}-${padDatePart(parsed.getMonth() + 1)}-${parsed.getFullYear()}`;
}

function isValidDateParts(day: number, month: number, year: number): boolean {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function normalizeDateInput(value: string): { value: string | null; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { value: null };
  }

  const dayMonthYear = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dayMonthYear) {
    const day = Number.parseInt(dayMonthYear[1], 10);
    const month = Number.parseInt(dayMonthYear[2], 10);
    const year = Number.parseInt(dayMonthYear[3], 10);
    if (!isValidDateParts(day, month, year)) {
      return { value: null, error: "Enter a valid date" };
    }
    return { value: `${year}-${padDatePart(month)}-${padDatePart(day)}` };
  }

  const isoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const year = Number.parseInt(isoDate[1], 10);
    const month = Number.parseInt(isoDate[2], 10);
    const day = Number.parseInt(isoDate[3], 10);
    if (!isValidDateParts(day, month, year)) {
      return { value: null, error: "Enter a valid date" };
    }
    return { value: trimmed };
  }

  const parsed = parseDate(trimmed);
  if (parsed) {
    return {
      value: `${parsed.getFullYear()}-${padDatePart(parsed.getMonth() + 1)}-${padDatePart(parsed.getDate())}`,
    };
  }

  return { value: null, error: "Enter a valid date" };
}

function computeNextWateringDate(
  lastWateredAt?: string | null,
  wateringIntervalDays?: number,
): Date | null {
  const last = parseDate(lastWateredAt);
  if (!last) return null;
  if (!wateringIntervalDays || wateringIntervalDays <= 0) return null;

  const next = new Date(last);
  next.setDate(next.getDate() + wateringIntervalDays);
  return next;
}

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfMonth(date: Date): Date {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function addMonths(date: Date, months: number): Date {
  const value = new Date(date);
  value.setDate(1);
  value.setMonth(value.getMonth() + months);
  value.setHours(0, 0, 0, 0);
  return value;
}

function formatDayKey(date: Date): string {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function getDaysUntil(nextDate: Date | null): number | null {
  if (!nextDate) return null;
  const today = startOfDay(new Date());
  const next = startOfDay(nextDate);
  return Math.round((next.getTime() - today.getTime()) / DAY_MS);
}

function toSentenceCase(value: string): string {
  const normalized = value.replace(/[-_]/g, " ").trim();
  if (!normalized) return "Not set";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function normalizeCareValue(value?: string): string {
  if (!value?.trim()) return "Not available";
  return toSentenceCase(value.trim());
}

function formatTemperatureLabel(temperatureC?: string): string {
  if (!temperatureC?.trim()) return "Not available";

  const raw = temperatureC.trim();
  const range = raw.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})$/);
  if (range) {
    const minC = Number.parseInt(range[1], 10);
    const maxC = Number.parseInt(range[2], 10);
    const minF = Math.round((minC * 9) / 5 + 32);
    const maxF = Math.round((maxC * 9) / 5 + 32);
    return `${minC}-${maxC}\u00b0C (${minF}-${maxF}\u00b0F)`;
  }

  const single = raw.match(/^(\d{1,2})$/);
  if (single) {
    const celsius = Number.parseInt(single[1], 10);
    const fahrenheit = Math.round((celsius * 9) / 5 + 32);
    return `${celsius}\u00b0C (${fahrenheit}\u00b0F)`;
  }

  return raw;
}

const buildEditDraft = (plant: Plant): EditDraft => {
  const intervalDays = plant.wateringIntervalDays ?? plant.wateringFrequencyDays;

  return {
    name: plant.name ?? "",
    room: plant.room ?? "",
    location: plant.location ?? "",
    wateringFrequencyDays: intervalDays ? String(intervalDays) : "",
    lastWateredAt: formatDateInput(plant.lastWateredAt),
    notes: plant.notes ?? "",
  };
};

const PlantDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { plant: initialPlant } = route.params;
  const { showSnackbar } = useSnackbar();
  const auth = useAuth();
  const [currentPlant, setCurrentPlant] = React.useState<Plant>(initialPlant);

  const speciesCommonName = currentPlant.species?.commonName ?? "Unknown species";
  const speciesScientificName = currentPlant.species?.scientificName;
  const intervalDays =
    currentPlant.wateringIntervalDays ??
    currentPlant.wateringFrequencyDays ??
    currentPlant.species?.defaultWateringIntervalDays;
  const speciesImageUrl = currentPlant.species?.imageUrl;

  const [isIntervalModalVisible, setIsIntervalModalVisible] = React.useState(false);
  const [intervalDraft, setIntervalDraft] = React.useState<string>(
    intervalDays ? String(intervalDays) : "",
  );
  const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
  const [editDraft, setEditDraft] = React.useState<EditDraft>(() => buildEditDraft(initialPlant));
  const [activeSpeciesChip, setActiveSpeciesChip] = React.useState<SpeciesChipKey | null>(null);
  const [wateringHistory, setWateringHistory] = React.useState<WateringHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = React.useState(true);
  const [historyError, setHistoryError] = React.useState<string | null>(null);
  const [displayedHistoryMonth, setDisplayedHistoryMonth] = React.useState(() => startOfMonth(new Date()));
  const [selectedHistoryDayKey, setSelectedHistoryDayKey] = React.useState<string | null>(null);
  const [waterButtonLabel, setWaterButtonLabel] = React.useState("Water now");
  const [isWateringNow, setIsWateringNow] = React.useState(false);
  const [waterOutcomeTone, setWaterOutcomeTone] = React.useState<"normal" | "today" | "rescue">("normal");
  const [waterButtonMeasuredWidth, setWaterButtonMeasuredWidth] = React.useState(0);
  const waterFillProgress = React.useRef(new Animated.Value(0)).current;
  const waterButtonScale = React.useRef(new Animated.Value(1)).current;
  const waterLabelOpacity = React.useRef(new Animated.Value(1)).current;

  const effectiveIntervalDays = intervalDays;

  const lastWateredDate = parseDate(currentPlant.lastWateredAt);
  const nextWateringDate = computeNextWateringDate(
    currentPlant.lastWateredAt,
    effectiveIntervalDays,
  );
  const daysUntilNext = getDaysUntil(nextWateringDate);

  const lastWateredLabel = lastWateredDate ? formatDateLabel(lastWateredDate) : "Not recorded";
  const nextDueLabel = nextWateringDate
    ? formatDateLabel(nextWateringDate)
    : effectiveIntervalDays && !lastWateredDate
      ? "Set last watered date first"
      : "No schedule";
  const intervalLabel = effectiveIntervalDays ? `Every ${effectiveIntervalDays} days` : "Not set";

  const statusConfig = React.useMemo(() => {
    if (!effectiveIntervalDays) {
      return {
        label: "Schedule needed",
        icon: "time-outline" as const,
        backgroundColor: "#eef2f7",
        textColor: "#334155",
      };
    }

    if (!lastWateredDate) {
      return {
        label: "Needs setup",
        icon: "information-circle-outline" as const,
        backgroundColor: "#fef3c7",
        textColor: "#92400e",
      };
    }

    if (daysUntilNext === null || daysUntilNext > 0) {
      return {
        label: "All good",
        icon: "checkmark-circle" as const,
        backgroundColor: "#dff4e7",
        textColor: colors.primary,
      };
    }

    if (daysUntilNext === 0) {
      return {
        label: "Water today",
        icon: "water-outline" as const,
        backgroundColor: "#e0f2fe",
        textColor: "#0369a1",
      };
    }

    return {
      label: "Overdue",
      icon: "alert-circle-outline" as const,
      backgroundColor: "#fee2e2",
      textColor: "#b91c1c",
    };
  }, [daysUntilNext, effectiveIntervalDays, lastWateredDate]);
  const heroTone: HeroTone = daysUntilNext !== null && daysUntilNext < 0
    ? "overdue"
    : daysUntilNext === 0
      ? "today"
      : "calm";
  const heroPalette = heroPaletteByTone[heroTone];
  const heroText = todayTheme.hero.text;

  const nextWateringHeroLabel = React.useMemo(() => {
    if (!effectiveIntervalDays) return "Set watering frequency";
    if (!lastWateredDate) return "Set last watered date first";
    if (daysUntilNext === null) return "No schedule";
    if (daysUntilNext > 0) return `Next watering in ${daysUntilNext} day${daysUntilNext === 1 ? "" : "s"}`;
    if (daysUntilNext === 0) return "Watering due today";
    const overdueDays = Math.abs(daysUntilNext);
    return `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`;
  }, [daysUntilNext, effectiveIntervalDays, lastWateredDate]);

  const openIntervalModal = () => {
    setIntervalDraft(effectiveIntervalDays ? String(effectiveIntervalDays) : "");
    setIsIntervalModalVisible(true);
  };

  const closeIntervalModal = () => {
    setIsIntervalModalVisible(false);
  };

  const openEditModal = () => {
    setEditDraft(buildEditDraft(currentPlant));
    setIsEditModalVisible(true);
  };

  const closeEditModal = () => {
    setIsEditModalVisible(false);
  };

  const loadWateringHistory = React.useCallback(async () => {
    if (!auth.token) {
      setWateringHistory([]);
      setHistoryError("Sign in again to view watering history.");
      setIsHistoryLoading(false);
      return;
    }

    setIsHistoryLoading(true);
    setHistoryError(null);

    try {
      const history = await fetchWateringHistory(currentPlant.id, auth.token);
      setWateringHistory(history);
      if (history.length > 0) {
        const latestLoggedAt = parseDate(history[0].timestamp) ?? new Date();
        setDisplayedHistoryMonth(startOfMonth(latestLoggedAt));
        setSelectedHistoryDayKey(formatDayKey(startOfDay(latestLoggedAt)));
      } else {
        setDisplayedHistoryMonth(startOfMonth(new Date()));
        setSelectedHistoryDayKey(null);
      }
    } catch (err) {
      console.error("fetchWateringHistory failed:", err);
      setWateringHistory([]);
      setHistoryError("Could not load watering history.");
    } finally {
      setIsHistoryLoading(false);
    }
  }, [auth.token, currentPlant.id]);

  React.useEffect(() => {
    void loadWateringHistory();
  }, [loadWateringHistory]);

  const updateEditDraft = <K extends keyof EditDraft>(key: K, value: EditDraft[K]) => {
    setEditDraft((prev) => ({ ...prev, [key]: value }));
  };

  const historyEntriesByDay = React.useMemo(() => {
    const grouped = new Map<string, WateringHistoryEntry[]>();

    wateringHistory.forEach((entry) => {
      const loggedAt = parseDate(entry.timestamp);
      if (!loggedAt) {
        return;
      }

      const key = formatDayKey(startOfDay(loggedAt));
      const entries = grouped.get(key) ?? [];
      entries.push(entry);
      grouped.set(key, entries);
    });

    return grouped;
  }, [wateringHistory]);

  const historyMonthTitle = React.useMemo(
    () =>
      displayedHistoryMonth.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [displayedHistoryMonth],
  );

  const historyCalendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(displayedHistoryMonth);
    const leadingDays = (monthStart.getDay() + 6) % 7;
    const gridStart = addDays(monthStart, -leadingDays);
    const todayKey = formatDayKey(startOfDay(new Date()));

    return Array.from({ length: 42 }, (_, index) => {
      const date = addDays(gridStart, index);
      const key = formatDayKey(date);

      return {
        key,
        date,
        entries: historyEntriesByDay.get(key) ?? [],
        isCurrentMonth: date.getMonth() === displayedHistoryMonth.getMonth(),
        isToday: key === todayKey,
        isSelected: key === selectedHistoryDayKey,
      };
    });
  }, [displayedHistoryMonth, historyEntriesByDay, selectedHistoryDayKey]);

  const selectedHistoryEntries = selectedHistoryDayKey
    ? historyEntriesByDay.get(selectedHistoryDayKey) ?? []
    : [];
  const selectedHistoryDate =
    selectedHistoryEntries.length > 0 ? parseDate(selectedHistoryEntries[0].timestamp) : null;
  const selectedHistoryTitle = selectedHistoryDate
    ? `Watered on ${selectedHistoryDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })} at ${selectedHistoryDate.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })}`
    : null;
  const selectedHistoryDayLabel = selectedHistoryDate
    ? selectedHistoryDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : null;
  const selectedHistoryCountLabel =
    selectedHistoryEntries.length === 1
      ? "1 watering event"
      : `${selectedHistoryEntries.length} watering events`;
  const historyMonthEntryCount = React.useMemo(
    () =>
      wateringHistory.filter((entry) => {
        const loggedAt = parseDate(entry.timestamp);
        return (
          loggedAt &&
          loggedAt.getMonth() === displayedHistoryMonth.getMonth() &&
          loggedAt.getFullYear() === displayedHistoryMonth.getFullYear()
        );
      }).length,
    [displayedHistoryMonth, wateringHistory],
  );

  const buildOptimisticPlant = React.useCallback((base: Plant, updates: PlantUpdate): Plant => {
    const resolvedInterval =
      updates.wateringIntervalDays ??
      updates.wateringFrequencyDays ??
      base.wateringIntervalDays ??
      base.wateringFrequencyDays;

    return {
      ...base,
      ...updates,
      wateringIntervalDays: resolvedInterval,
      wateringFrequencyDays: resolvedInterval,
    };
  }, []);

  const applyPlantUpdate = async (
    updates: PlantUpdate,
    successMessage: string,
    options?: { silentSuccess?: boolean; optimisticPatch?: Partial<Plant> },
  ): Promise<boolean> => {
    const optimisticPatch = options?.optimisticPatch ?? {};

    try {
      const updatedPlant = await updatePlant(currentPlant.id, updates, auth.token);

      if (updatedPlant) {
        setCurrentPlant((prev) => ({
          ...prev,
          ...updatedPlant,
          species: updatedPlant.species ?? prev.species,
          speciesId: updatedPlant.speciesId ?? prev.speciesId,
          wateringIntervalDays:
            updatedPlant.wateringIntervalDays ??
            updatedPlant.wateringFrequencyDays ??
            prev.wateringIntervalDays,
          wateringFrequencyDays:
            updatedPlant.wateringFrequencyDays ??
            updatedPlant.wateringIntervalDays ??
            prev.wateringFrequencyDays,
          ...optimisticPatch,
        }));
      } else {
        setCurrentPlant((prev) => ({
          ...prev,
          ...updates,
          wateringIntervalDays:
            updates.wateringIntervalDays ??
            updates.wateringFrequencyDays ??
            prev.wateringIntervalDays,
          wateringFrequencyDays:
            updates.wateringFrequencyDays ??
            updates.wateringIntervalDays ??
            prev.wateringFrequencyDays,
          ...optimisticPatch,
        }));
      }

      if (!options?.silentSuccess) {
        showSnackbar({ message: successMessage, type: "success", duration: 2000 });
      }
      return true;
    } catch (err) {
      console.error("updatePlant failed:", err);
      const msg = err instanceof Error ? err.message : String(err);

      if (msg.includes("401") || msg.includes("403")) {
        auth.logout?.();
      }

      showSnackbar({ message: "Could not update plant. Please try again.", type: "error", duration: 2000 });
      return false;
    }
  };

  const submitIntervalEdit = async () => {
    const parsed = Number.parseInt(intervalDraft, 10);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) {
      showSnackbar({
        message: "Enter a valid watering frequency (days)",
        type: "error",
        duration: 2000,
      });
      return;
    }

    if (parsed > 90) {
      showSnackbar({ message: "Max is 90 days", type: "error", duration: 2000 });
      return;
    }

    const previousPlant = currentPlant;
    const optimisticPlant = buildOptimisticPlant(currentPlant, { wateringFrequencyDays: parsed });
    setCurrentPlant(optimisticPlant);

    const success = await applyPlantUpdate(
      { wateringFrequencyDays: parsed },
      "Watering frequency updated",
      { optimisticPatch: optimisticPlant },
    );

    if (success) {
      setIsIntervalModalVisible(false);
    } else {
      setCurrentPlant(previousPlant);
    }
  };

  const getWaterOutcome = React.useCallback((daysUntilDue: number | null) => {
    if (daysUntilDue !== null && daysUntilDue < 0) {
      return {
        tone: "rescue" as const,
        label: "Plant saved!",
      };
    }
    if (daysUntilDue === 0) {
      return {
        tone: "today" as const,
        label: "Right on time!",
      };
    }
    return {
      tone: "normal" as const,
      label: "Freshly watered!",
    };
  }, []);

  const runWaterNowAnimation = React.useCallback((tone: "normal" | "today" | "rescue", successLabel: string) => {
    setIsWateringNow(true);
    setWaterOutcomeTone(tone);
    setWaterButtonLabel("Water now");

    waterFillProgress.setValue(0);
    waterButtonScale.setValue(1);
    waterLabelOpacity.setValue(1);

    Animated.parallel([
      Animated.timing(waterFillProgress, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(waterButtonScale, {
          toValue: 1.06,
          duration: 170,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(waterButtonScale, {
          toValue: 1,
          duration: 210,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(waterLabelOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setWaterButtonLabel(successLabel);
      Animated.timing(waterLabelOpacity, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }).start(() => {
        Animated.delay(780).start(() => {
          Animated.parallel([
            Animated.timing(waterFillProgress, {
              toValue: 0,
              duration: 280,
              easing: Easing.out(Easing.quad),
              useNativeDriver: false,
            }),
            Animated.timing(waterLabelOpacity, {
              toValue: 0,
              duration: 120,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setWaterButtonLabel("Water now");
            setWaterOutcomeTone("normal");
            Animated.timing(waterLabelOpacity, {
              toValue: 1,
              duration: 140,
              useNativeDriver: true,
            }).start(() => {
              setIsWateringNow(false);
            });
          });
        });
      });
    });
  }, [waterButtonScale, waterFillProgress, waterLabelOpacity]);

  const handleWaterNow = async () => {
    if (isWateringNow) {
      return;
    }

    const outcome = getWaterOutcome(daysUntilNext);
    runWaterNowAnimation(outcome.tone, outcome.label);

    const now = new Date();
    const wateredAt = now.toISOString();
    const previousLastWateredAt = currentPlant.lastWateredAt;

    // Optimistic UI: clear overdue state immediately after tapping.
    setCurrentPlant((prev) => ({
      ...prev,
      lastWateredAt: wateredAt,
    }));

    let success = false;

    try {
      const response = await waterPlant(currentPlant.id, wateredAt, auth.token);
      const resolvedWateredAt = response.wateredAt ?? wateredAt;

      setCurrentPlant((prev) => ({
        ...prev,
        lastWateredAt: resolvedWateredAt,
      }));
      setWateringHistory((prev) => [
        {
          id: `${response.plantId}-${resolvedWateredAt}`,
          timestamp: resolvedWateredAt,
        },
        ...prev,
      ]);
      const resolvedDate = parseDate(resolvedWateredAt) ?? new Date();
      setDisplayedHistoryMonth(startOfMonth(resolvedDate));
      setSelectedHistoryDayKey(formatDayKey(startOfDay(resolvedDate)));
      setHistoryError(null);

      success = true;
    } catch (err) {
      console.error("waterPlant failed:", err);
      const msg = err instanceof Error ? err.message : String(err);

      if (msg.includes("401") || msg.includes("403")) {
        auth.logout?.();
      }

      showSnackbar({ message: "Could not update plant. Please try again.", type: "error", duration: 2000 });
    }

    if (!success) {
      setIsWateringNow(false);
      setWaterButtonLabel("Water now");
      setWaterOutcomeTone("normal");
      waterFillProgress.setValue(0);
      waterButtonScale.setValue(1);
      waterLabelOpacity.setValue(1);
      setCurrentPlant((prev) => ({
        ...prev,
        lastWateredAt: previousLastWateredAt,
      }));
    }
  };

  const handleEdit = () => {
    openEditModal();
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete plant?",
      "This will permanently remove this plant.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePlant(currentPlant.id, auth.token);
              showSnackbar({ message: "Plant deleted", type: "success", duration: 2000 });
              navigation.goBack();
            } catch (err) {
              console.error("deletePlant failed:", err);
              const msg = err instanceof Error ? err.message : String(err);

              if (msg.includes("401") || msg.includes("403")) {
                auth.logout?.();
              }

              showSnackbar({ message: "Could not delete plant. Please try again.", type: "error", duration: 2000 });
            }
          }
        },
      ],
    );
  };

  const submitEdit = async () => {
    const trimmedName = editDraft.name.trim();
    if (!trimmedName) {
      showSnackbar({ message: "Plant nickname is required", type: "error", duration: 2000 });
      return;
    }

    const intervalValue = editDraft.wateringFrequencyDays.trim();
    let parsedInterval: number | undefined;

    if (intervalValue) {
      parsedInterval = Number.parseInt(intervalValue, 10);
      if (!Number.isFinite(parsedInterval) || Number.isNaN(parsedInterval) || parsedInterval <= 0) {
        showSnackbar({ message: "Enter a valid watering frequency", type: "error", duration: 2000 });
        return;
      }
      if (parsedInterval > 90) {
        showSnackbar({ message: "Max is 90 days", type: "error", duration: 2000 });
        return;
      }
    }

    const dateResult = normalizeDateInput(editDraft.lastWateredAt);
    if (dateResult.error) {
      showSnackbar({ message: "Enter a valid last watered date", type: "error", duration: 2000 });
      return;
    }

    const updates: PlantUpdate = {};
    const currentName = currentPlant.name?.trim() ?? "";
    const currentRoom = currentPlant.room?.trim() ?? "";
    const currentLocation = currentPlant.location?.trim() ?? "";
    const currentNotes = currentPlant.notes?.trim() ?? "";
    const currentInterval =
      currentPlant.wateringFrequencyDays ?? currentPlant.wateringIntervalDays;

    const currentDateResult = normalizeDateInput(currentPlant.lastWateredAt ?? "");
    const currentLastWateredAt = currentDateResult.value ?? null;

    if (trimmedName !== currentName) {
      updates.name = trimmedName;
    }

    if (editDraft.room.trim() !== currentRoom) {
      updates.room = editDraft.room.trim();
    }

    if (editDraft.location.trim() !== currentLocation) {
      updates.location = editDraft.location.trim();
    }

    if (editDraft.notes.trim() !== currentNotes) {
      updates.notes = editDraft.notes.trim();
    }

    if (parsedInterval !== undefined && parsedInterval !== currentInterval) {
      updates.wateringFrequencyDays = parsedInterval;
    }

    if (dateResult.value !== currentLastWateredAt) {
      updates.lastWateredAt = dateResult.value;
    }

    if (Object.keys(updates).length === 0) {
      showSnackbar({ message: "No changes to update", type: "info", duration: 2000 });
      return;
    }

    const previousPlant = currentPlant;
    const optimisticPlant = buildOptimisticPlant(currentPlant, updates);
    setCurrentPlant(optimisticPlant);

    const success = await applyPlantUpdate(
      updates,
      "Plant updated",
      { optimisticPatch: optimisticPlant },
    );
    if (success) {
      setIsEditModalVisible(false);
    } else {
      setCurrentPlant(previousPlant);
    }
  };

  const handleSpeciesChipPress = React.useCallback((chip: SpeciesChipKey) => {
    setActiveSpeciesChip((prev) => (prev === chip ? null : chip));
  }, []);

  const collapseSpeciesChips = React.useCallback(() => {
    setActiveSpeciesChip(null);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.sm },
        ]}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={collapseSpeciesChips}
        onTouchStart={collapseSpeciesChips}
      >
        <View style={[styles.heroCardShell, { borderColor: heroPalette.border }]}>
          <LinearGradient
            colors={heroPalette.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextCol}>
              <Text style={[styles.name, { color: heroText.primary }]} numberOfLines={2}>
                {currentPlant.name}
              </Text>
              <Text style={[styles.subtitle, { color: heroText.secondary }]} numberOfLines={2}>
                {speciesScientificName
                  ? `${speciesCommonName} · ${speciesScientificName}`
                  : speciesCommonName}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: statusConfig.backgroundColor,
                  },
                ]}
              >
                <Ionicons name={statusConfig.icon} size={14} color={statusConfig.textColor} />
                <Text style={[styles.statusText, { color: statusConfig.textColor }]}>{statusConfig.label}</Text>
              </View>

              <View style={styles.heroInfoRow}>
                <Ionicons name="calendar-outline" size={16} color={heroText.muted} />
                <Text style={[styles.heroInfoText, { color: heroText.primary }]}>
                  {nextWateringHeroLabel}
                </Text>
              </View>

              <View style={styles.tagsRow}>
                <TouchableOpacity
                  style={styles.tagOutline}
                  onPress={openIntervalModal}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Edit watering frequency"
                >
                  <Ionicons name="refresh-outline" size={14} color={heroText.primary} />
                  <Text style={[styles.tagText, { color: heroText.primary }]}>
                    {effectiveIntervalDays ? `Every ${effectiveIntervalDays} days` : "No schedule"}
                  </Text>
                </TouchableOpacity>
                <View style={styles.tagOutline}>
                  <Ionicons name="location-outline" size={14} color={heroText.primary} />
                  <Text style={[styles.tagText, { color: heroText.primary }]} numberOfLines={1}>
                    {currentPlant.room || "Not set"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.heroImageWrap}>
              {speciesImageUrl ? (
                <Image source={{ uri: speciesImageUrl }} style={styles.heroImage} />
              ) : (
                <View style={styles.heroImageFallback} />
              )}
            </View>
          </View>

            <View style={styles.heroActionsRow}>
              <View style={styles.primaryButtonWrap}>
                <Animated.View style={{ transform: [{ scale: waterButtonScale }] }}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleWaterNow}
                    activeOpacity={0.9}
                    disabled={isWateringNow}
                    onLayout={(event) => setWaterButtonMeasuredWidth(event.nativeEvent.layout.width)}
                  >
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.primaryButtonFill,
                        waterOutcomeTone === "rescue"
                          ? styles.primaryButtonFillRescue
                          : waterOutcomeTone === "today"
                            ? styles.primaryButtonFillToday
                            : styles.primaryButtonFillNormal,
                        {
                          width: waterFillProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, Math.max(1, waterButtonMeasuredWidth)],
                          }),
                        },
                      ]}
                    />
                    <Animated.View style={[styles.primaryButtonContent, { opacity: waterLabelOpacity }]}>
                      <Ionicons
                        name={waterOutcomeTone === "rescue" ? "heart" : "water-outline"}
                        size={18}
                        color="#0f172a"
                      />
                      <Text style={styles.primaryButtonText}>{waterButtonLabel}</Text>
                    </Animated.View>
                  </TouchableOpacity>
                </Animated.View>
              </View>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleEdit} activeOpacity={0.85}>
                <Ionicons name="pencil-outline" size={18} color="#ffffff" />
                <Text style={styles.secondaryButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Care summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCol}>
              <View style={[styles.summaryIconWrap, { backgroundColor: "#dff4e7" }]}>
                <Ionicons name="water" size={16} color={colors.primary} />
              </View>
              <Text style={styles.summaryLabel}>Last watered</Text>
              <Text style={styles.summaryValue}>{lastWateredLabel}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <View style={[styles.summaryIconWrap, { backgroundColor: "#fef3c7" }]}>
                <Ionicons name="calendar-outline" size={16} color="#a16207" />
              </View>
              <Text style={styles.summaryLabel}>Next watering</Text>
              <Text style={styles.summaryValue}>{nextDueLabel}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <View style={[styles.summaryIconWrap, { backgroundColor: "#e0eaff" }]}>
                <Ionicons name="refresh-outline" size={16} color="#1d4ed8" />
              </View>
              <Text style={styles.summaryLabel}>Watering frequency</Text>
              <Text style={styles.summaryValue}>{intervalLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Plant details</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaRowLabelWrap}>
              <View style={styles.metaIconSoft}>
                <Ionicons name="home-outline" size={16} color={colors.primary} />
              </View>
              <Text style={styles.metaLabelStrong}>Room</Text>
            </View>
            <Text style={styles.metaValueStrong}>{currentPlant.room || "Not set"}</Text>
          </View>
          <View style={styles.metaSeparator} />
          <View style={styles.metaRow}>
            <View style={styles.metaRowLabelWrap}>
              <View style={styles.metaIconSoft}>
                <Ionicons name="location-outline" size={16} color={colors.primary} />
              </View>
              <Text style={styles.metaLabelStrong}>Location</Text>
            </View>
            <Text style={styles.metaValue}>{currentPlant.location || "Not set"}</Text>
          </View>
          <View style={styles.metaSeparator} />
          <View style={styles.metaRow}>
            <View style={styles.metaRowLabelWrap}>
              <View style={styles.metaIconSoft}>
                <Ionicons name="document-text-outline" size={16} color={colors.primary} />
              </View>
              <Text style={styles.metaLabelStrong}>Notes</Text>
            </View>
            <Text style={styles.metaValue}>{currentPlant.notes || "No notes yet"}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Species care</Text>
          <View style={styles.speciesTagsRow}>
            <ExpandableSpeciesChip
              icon="sunny-outline"
              label={normalizeCareValue(currentPlant.species?.careInstructions?.light)}
              textColor="#5b21b6"
              chipStyle={styles.speciesTagLight}
              isActive={activeSpeciesChip === "light"}
              onPress={() => handleSpeciesChipPress("light")}
            />

            <ExpandableSpeciesChip
              icon="water-outline"
              label={effectiveIntervalDays && effectiveIntervalDays >= 10 ? "Dry tolerant" : "Moderate watering"}
              textColor="#1d4ed8"
              chipStyle={styles.speciesTagWater}
              isActive={activeSpeciesChip === "water"}
              onPress={() => handleSpeciesChipPress("water")}
            />

            <ExpandableSpeciesChip
              icon={currentPlant.species?.properties?.isToxicToPets ? "paw-outline" : "heart-outline"}
              label={currentPlant.species?.properties?.isToxicToPets ? "Toxic to pets" : "Pet safe"}
              textColor={currentPlant.species?.properties?.isToxicToPets ? "#c2410c" : "#166534"}
              chipStyle={
                currentPlant.species?.properties?.isToxicToPets
                  ? styles.speciesTagDanger
                  : styles.speciesTagSafe
              }
              isActive={activeSpeciesChip === "toxicity"}
              onPress={() => handleSpeciesChipPress("toxicity")}
            />
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaRowLabelWrap}>
              <Ionicons name="sunny-outline" size={17} color={colors.primary} />
              <Text style={styles.metaLabelStrong}>Light</Text>
            </View>
            <Text style={styles.metaValue}>
              {normalizeCareValue(currentPlant.species?.careInstructions?.light)}
            </Text>
          </View>
          <View style={styles.metaSeparator} />
          <View style={styles.metaRow}>
            <View style={styles.metaRowLabelWrap}>
              <Ionicons name="leaf-outline" size={17} color={colors.primary} />
              <Text style={styles.metaLabelStrong}>Soil</Text>
            </View>
            <Text style={styles.metaValue}>
              {normalizeCareValue(currentPlant.species?.careInstructions?.soil)}
            </Text>
          </View>
          <View style={styles.metaSeparator} />
          <View style={styles.metaRow}>
            <View style={styles.metaRowLabelWrap}>
              <Ionicons name="water-outline" size={17} color={colors.primary} />
              <Text style={styles.metaLabelStrong}>Humidity</Text>
            </View>
            <Text style={styles.metaValue}>
              {normalizeCareValue(currentPlant.species?.careInstructions?.humidity)}
            </Text>
          </View>
          <View style={styles.metaSeparator} />
          <View style={styles.metaRow}>
            <View style={styles.metaRowLabelWrap}>
              <Ionicons name="thermometer-outline" size={17} color={colors.primary} />
              <Text style={styles.metaLabelStrong}>Temperature</Text>
            </View>
            <Text style={styles.metaValue}>
              {formatTemperatureLabel(currentPlant.species?.careInstructions?.temperatureC)}
            </Text>
          </View>
          <View style={styles.metaSeparator} />
          <View style={styles.metaRow}>
            <View style={styles.metaRowLabelWrap}>
              <Ionicons name="paw-outline" size={17} color={colors.primary} />
              <Text style={styles.metaLabelStrong}>Toxicity</Text>
            </View>
            <Text style={styles.metaValue}>
              {currentPlant.species?.properties?.isToxicToPets
                ? "Toxic to pets if ingested"
                : "Pet safe"}
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.careHistoryHeader}>
            <View style={styles.metaIconSoft}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitleNoMargin}>Care history</Text>
          </View>
          {isHistoryLoading ? (
            <View style={styles.historyStateBlock}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.historyHelperText}>Loading watering history…</Text>
            </View>
          ) : historyError ? (
            <View style={styles.historyStateBlock}>
              <Text style={styles.careHistoryTitle}>History unavailable</Text>
              <Text style={styles.placeholderText}>{historyError}</Text>
              <TouchableOpacity style={styles.historyRetryButton} onPress={() => void loadWateringHistory()}>
                <Text style={styles.historyRetryButtonText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : wateringHistory.length === 0 ? (
            <>
              <Text style={styles.careHistoryTitle}>No watering history yet.</Text>
              <Text style={styles.placeholderText}>
                Once you water this plant, its care log will appear here.
              </Text>
              <View style={styles.historyDecoration}>
                <Ionicons name="leaf-outline" size={44} color="rgba(14,149,63,0.2)" />
              </View>
            </>
          ) : (
            <View style={styles.historyCalendarWrap}>
              <View style={styles.historyCalendarHeader}>
                <View style={styles.historyMonthBlock}>
                  <Text style={styles.historyMonthLabel}>{historyMonthTitle}</Text>
                  <Text style={styles.historyMonthMeta}>
                    {historyMonthEntryCount} watering entr{historyMonthEntryCount === 1 ? "y" : "ies"}
                  </Text>
                </View>
                <View style={styles.historyMonthActions}>
                  <TouchableOpacity
                    style={styles.historyMonthNav}
                    onPress={() => setDisplayedHistoryMonth((current) => addMonths(current, -1))}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="chevron-back" size={15} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.historyMonthNav}
                    onPress={() => setDisplayedHistoryMonth((current) => addMonths(current, 1))}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="chevron-forward" size={15} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.historyWeekdayRow}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, index) => (
                  <View key={`${label}-${index}`} style={styles.historyWeekdayCell}>
                    <Text style={styles.historyWeekdayLabel}>{label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.historyCalendarGrid}>
                {historyCalendarDays.map((day) => {
                  const hasEntries = day.entries.length > 0;

                  return (
                    <TouchableOpacity
                      key={day.key}
                      style={[
                        styles.historyCalendarCell,
                        !day.isCurrentMonth && styles.historyCalendarCellMuted,
                        day.isToday && styles.historyCalendarCellToday,
                        day.isSelected && styles.historyCalendarCellSelected,
                      ]}
                      onPress={() => {
                        if (!day.isCurrentMonth || !hasEntries) {
                          return;
                        }
                        setSelectedHistoryDayKey(day.key);
                      }}
                      activeOpacity={hasEntries && day.isCurrentMonth ? 0.85 : 1}
                      disabled={!hasEntries || !day.isCurrentMonth}
                    >
                      <View
                        style={[
                          styles.historyCalendarCellInner,
                          day.isToday && styles.historyCalendarCellInnerToday,
                          day.isSelected && styles.historyCalendarCellInnerSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.historyCalendarDayNumber,
                            !day.isCurrentMonth && styles.historyCalendarDayNumberMuted,
                            day.isSelected && styles.historyCalendarDayNumberSelected,
                          ]}
                        >
                          {day.date.getDate()}
                        </Text>
                        <View
                          style={[
                            styles.historyCalendarDot,
                            hasEntries && styles.historyCalendarDotActive,
                            day.isSelected && styles.historyCalendarDotSelected,
                          ]}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedHistoryEntries.length > 0 && selectedHistoryTitle ? (
                <View style={styles.historyDetailCard}>
                  <View style={styles.historyDetailHeader}>
                    <View>
                      <Text style={styles.historyDetailEyebrow}>{selectedHistoryDayLabel}</Text>
                      <Text style={styles.historyDetailTitle}>{selectedHistoryTitle}</Text>
                    </View>
                    {selectedHistoryEntries.length > 1 ? (
                      <Text style={styles.historyDetailCountText}>{selectedHistoryCountLabel}</Text>
                    ) : null}
                  </View>
                  <View style={styles.historyTimeChipRow}>
                    {selectedHistoryEntries.slice(0, 4).map((entry) => {
                      const loggedAt = parseDate(entry.timestamp);
                      if (!loggedAt) {
                        return null;
                      }

                      return (
                        <View key={entry.id} style={styles.historyTimeChip}>
                          <Text style={styles.historyTimeChipText}>
                            {loggedAt.toLocaleTimeString(undefined, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  {selectedHistoryEntries.length > 4 ? (
                    <Text style={styles.historyDetailSubtitle}>
                      +{selectedHistoryEntries.length - 4} more on this day
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View style={styles.historyDetailCardEmpty}>
                  <Text style={styles.historyDetailEmptyText}>Select a marked day to inspect watering activity.</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.dangerCard}>
          <TouchableOpacity
            style={styles.dangerRow}
            onPress={handleDelete}
            activeOpacity={0.85}
          >
            <View style={styles.dangerRowText}>
              <Text style={styles.dangerRowTitle}>Delete plant</Text>
              <Text style={styles.dangerRowSubtitle} numberOfLines={1}>
                This cannot be undone.
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <Modal
        visible={isIntervalModalVisible}
        transparent
        animationType="slide"
        {...(Platform.OS === "ios" ? { presentationStyle: "overFullScreen" } : {})}
        statusBarTranslucent={Platform.OS === "android"}
        onRequestClose={closeIntervalModal}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeIntervalModal}>
          <Pressable style={styles.sheetCard} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetTitle}>Watering frequency</Text>
                <Text style={styles.sheetSubtitle}>How often should this plant be watered?</Text>
              </View>
              <TouchableOpacity
                style={styles.sheetClose}
                onPress={closeIntervalModal}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <FormField
              label="Watering frequency (days)"
              value={intervalDraft}
              onChangeText={(t) => setIntervalDraft(t.replace(/[^0-9]/g, ""))}
              placeholder="7"
              keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
              returnKeyType="done"
              maxLength={2}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={closeIntervalModal}
                activeOpacity={0.85}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={submitIntervalEdit}
                activeOpacity={0.85}
              >
                <Text style={styles.modalButtonPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <PlantEditModal
        visible={isEditModalVisible}
        draft={editDraft}
        onChange={updateEditDraft}
        onClose={closeEditModal}
        onSave={submitEdit}
      />
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
  scrollContent: {
    paddingBottom: spacing.xl,
  },

  heroCardShell: {
    borderRadius: HERO_RADIUS,
    borderWidth: 1,
    boxShadow: boxShadows.md,
    marginBottom: spacing.md,
  },
  heroCard: {
    borderRadius: HERO_RADIUS,
    overflow: "hidden",
    position: "relative",
    padding: spacing.md,
  },
  heroTopRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  heroTextCol: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  heroImageWrap: {
    width: 122,
    height: 162,
    borderRadius: HERO_RADIUS,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroImageFallback: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
  },
  heroActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryButtonWrap: {
    flex: 1,
    position: "relative",
  },
  primaryButtonContent: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    zIndex: 2,
  },
  primaryButtonFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.md,
    zIndex: 0,
  },
  primaryButtonFillNormal: {
    backgroundColor: "rgba(21,128,61,0.24)",
  },
  primaryButtonFillToday: {
    backgroundColor: "rgba(29,78,216,0.24)",
  },
  primaryButtonFillRescue: {
    backgroundColor: "rgba(22,163,74,0.26)",
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "800",
  },
  heroInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  heroInfoText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "700",
  },

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tagOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },

  primaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.68)",
    overflow: "hidden",
    position: "relative",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.20)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.62)",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },

  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionTitleNoMargin: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  summaryGrid: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  summaryCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  summaryIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
  },
  summaryValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "800",
    textAlign: "center",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  metaRowLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  metaIconSoft: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e9f5ec",
    alignItems: "center",
    justifyContent: "center",
  },
  metaLabelStrong: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "600",
  },
  metaLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
  },
  metaValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  metaValueStrong: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    color: colors.text,
    fontWeight: "800",
  },
  metaSeparator: {
    height: 1,
    backgroundColor: colors.border,
  },
  speciesTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  speciesTagPressable: {
    alignSelf: "flex-start",
  },
  speciesTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  speciesTagAnimatedWrap: {
    overflow: "hidden",
  },
  speciesTagMeasure: {
    position: "absolute",
    opacity: 0,
    zIndex: -1,
    left: -9999,
    top: -9999,
    fontSize: 14,
    fontWeight: "700",
  },
  speciesTagLight: {
    backgroundColor: "#f3ebff",
    borderColor: "#d1bbff",
  },
  speciesTagWater: {
    backgroundColor: "#e7eeff",
    borderColor: "#bdd0ff",
  },
  speciesTagDanger: {
    backgroundColor: "#ffe7e7",
    borderColor: "#ffb8b8",
  },
  speciesTagSafe: {
    backgroundColor: "#e8f9ed",
    borderColor: "#b9ebc8",
  },
  speciesTagText: {
    fontSize: 14,
    fontWeight: "700",
  },
  careHistoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  careHistoryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  historyDecoration: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.sm,
  },
  historyStateBlock: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  historyHelperText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
  historyRetryButton: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  historyRetryButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "700",
  },
  historyCalendarWrap: {
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e3ebe4",
    padding: spacing.xs + 2,
  },
  historyCalendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  historyMonthBlock: {
    flex: 1,
    gap: 2,
  },
  historyMonthActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  historyMonthNav: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dce7da",
  },
  historyMonthLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  historyMonthMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  historyWeekdayRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 1,
  },
  historyWeekdayCell: {
    flexBasis: "14.2857%",
    maxWidth: "14.2857%",
    alignItems: "center",
    justifyContent: "center",
  },
  historyWeekdayLabel: {
    textAlign: "center",
    fontSize: 9,
    fontWeight: "700",
    color: "#8a978c",
  },
  historyCalendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginTop: 0,
  },
  historyCalendarCell: {
    flexBasis: "14.2857%",
    maxWidth: "14.2857%",
    aspectRatio: 1.62,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  historyCalendarCellMuted: {
    opacity: 0.34,
  },
  historyCalendarCellSelected: {
    opacity: 1,
  },
  historyCalendarCellToday: {
    opacity: 1,
  },
  historyCalendarCellInner: {
    width: "76%",
    height: "100%",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    gap: 1,
  },
  historyCalendarCellInnerToday: {
    backgroundColor: "#edf7ef",
    borderWidth: 1,
    borderColor: "#c9ddce",
  },
  historyCalendarCellInnerSelected: {
    backgroundColor: "#0e953f",
    borderWidth: 1,
    borderColor: "#0e953f",
    boxShadow: boxShadows.sm,
  },
  historyCalendarDayNumber: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.text,
  },
  historyCalendarDayNumberMuted: {
    color: colors.textMuted,
  },
  historyCalendarDayNumberSelected: {
    color: colors.surface,
  },
  historyCalendarDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  historyCalendarDotActive: {
    backgroundColor: "#0e953f",
  },
  historyCalendarDotSelected: {
    backgroundColor: "#ffffff",
  },
  historyDetailCard: {
    marginTop: spacing.xs,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    backgroundColor: "#f4faf5",
    borderWidth: 1,
    borderColor: "#d6e8d9",
    gap: spacing.xs,
  },
  historyDetailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  historyDetailEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7b6f",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  historyDetailTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  historyDetailCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5f7664",
    textAlign: "right",
    paddingTop: 2,
  },
  historyDetailSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  historyTimeChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  historyTimeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "#f7faf7",
    borderWidth: 1,
    borderColor: "#dce7de",
  },
  historyTimeChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  historyDetailCardEmpty: {
    marginTop: spacing.xs,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    backgroundColor: "#f4faf5",
    borderWidth: 1,
    borderColor: "#d6e8d9",
  },
  historyDetailEmptyText: {
    fontSize: 12,
    color: colors.textMuted,
  },

  placeholderText: {
    fontSize: 14,
    color: colors.textMuted,
  },

  dangerCard: {
    backgroundColor: "#fff8f8",
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#f7caca",
    boxShadow: boxShadows.sm,
  },

  dangerLabel: {
    fontSize: 18,
    color: colors.error,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  dangerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "transparent",
  },
  dangerRowText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  dangerRowTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.error,
  },
  dangerRowSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
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
    paddingBottom: spacing.lg,
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
  sheetHeaderText: {
    flex: 1,
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
  modalButtonsRow: {
    marginTop: spacing.lg,
    flexDirection: "row",
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonSecondary: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonSecondaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.text,
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
  },
  modalButtonPrimaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.background,
  },
});

export default PlantDetailsScreen;
