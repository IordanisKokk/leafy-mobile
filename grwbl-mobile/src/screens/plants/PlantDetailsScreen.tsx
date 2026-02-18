/**
 * Plant details page (what we likely need here)
 * - Hero: nickname, species (common + scientific), and image
 * - Care summary: last watered, next due, interval, and a "Water now" action
 * - Edit actions: update nickname/location/room/notes, set interval, set last-watered date
 * - History: watering log + upcoming reminders (later)
 * - Danger zone: delete (confirm) / archive
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { PlantsStackParamList } from "../../navigation/PlantsStackNavigator";
import { boxShadows, colors, radius, spacing } from "../../theme";
import Header from "../../components/Header";
import { useSnackbar } from "../../context/SnackbarContext";
import { useAuth } from "../../context/AuthContext";
import { Plant, PlantUpdate, deletePlant, updatePlant } from "../../api/plants";
import PlantEditModal, { EditDraft } from "./components/PlantEditModal";
import FormField from "../../components/FormField";

type Props = NativeStackScreenProps<PlantsStackParamList, "PlantDetails">;

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
  const { plant: initialPlant } = route.params;
  const { showSnackbar } = useSnackbar();
  const auth = useAuth();
  const [currentPlant, setCurrentPlant] = React.useState<Plant>(initialPlant);

  const speciesCommonName = currentPlant.species?.commonName ?? "Unknown species";
  const speciesScientificName = currentPlant.species?.scientificName;
  const intervalDays = currentPlant.wateringIntervalDays ?? currentPlant.wateringFrequencyDays;
  const speciesImageUrl = currentPlant.species?.imageUrl;

  const [isIntervalModalVisible, setIsIntervalModalVisible] = React.useState(false);
  const [intervalDraft, setIntervalDraft] = React.useState<string>(
    intervalDays ? String(intervalDays) : "",
  );
  const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
  const [editDraft, setEditDraft] = React.useState<EditDraft>(() => buildEditDraft(initialPlant));

  const effectiveIntervalDays = intervalDays;

  const lastWateredDate = parseDate(currentPlant.lastWateredAt);
  const nextWateringDate = computeNextWateringDate(
    currentPlant.lastWateredAt,
    effectiveIntervalDays,
  );

  const lastWateredLabel = lastWateredDate ? formatDateLabel(lastWateredDate) : "Not recorded";
  const nextDueLabel = nextWateringDate
    ? formatDateLabel(nextWateringDate)
    : effectiveIntervalDays
      ? "Needs last watered date"
      : "No schedule";
  const intervalLabel = effectiveIntervalDays ? `Every ${effectiveIntervalDays} days` : "Not set";

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

  const updateEditDraft = <K extends keyof EditDraft>(key: K, value: EditDraft[K]) => {
    setEditDraft((prev) => ({ ...prev, [key]: value }));
  };

  const applyPlantUpdate = async (updates: PlantUpdate, successMessage: string): Promise<boolean> => {
    try {
      const updatedPlant = await updatePlant(currentPlant.id, updates, auth.token);

      if (updatedPlant) {
        setCurrentPlant(updatedPlant);
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
        }));
      }

      showSnackbar({ message: successMessage, type: "success", duration: 2000 });
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

    const success = await applyPlantUpdate(
      { wateringFrequencyDays: parsed },
      "Watering frequency updated",
    );

    if (success) {
      setIsIntervalModalVisible(false);
    }
  };

  const handleWaterNow = () => {
    console.log("Water now pressed for:", currentPlant.id);
    showSnackbar({ message: "Watering action coming soon (dummy)", type: "info", duration: 2000 });
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

    const updates: PlantUpdate = {
      name: trimmedName,
      room: editDraft.room.trim(),
      location: editDraft.location.trim(),
      notes: editDraft.notes.trim(),
      lastWateredAt: editDraft.lastWateredAt.trim() || null,
    };

    if (parsedInterval !== undefined) {
      updates.wateringFrequencyDays = parsedInterval;
    }

    const dateResult = normalizeDateInput(editDraft.lastWateredAt);
    if (dateResult.error) {
      showSnackbar({ message: "Enter a valid last watered date", type: "error", duration: 2000 });
      return;
    }

    updates.lastWateredAt = dateResult.value;

    const success = await applyPlantUpdate(updates, "Plant updated");
    if (success) {
      setIsEditModalVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Plant" showBackButton={true} showLogo={false} hide={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextCol}>
              <Text style={styles.name} numberOfLines={2}>
                {currentPlant.name}
              </Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                {speciesScientificName
                  ? `${speciesCommonName} · ${speciesScientificName}`
                  : speciesCommonName}
              </Text>

              <View style={styles.tagsRow}>
                <TouchableOpacity
                  style={styles.tag}
                  onPress={openIntervalModal}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Edit watering frequency"
                >
                  <Text style={styles.tagText}>
                    {effectiveIntervalDays ? `Every ${effectiveIntervalDays} days` : "No schedule"}
                  </Text>
                </TouchableOpacity>
                {!!currentPlant.room && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText} numberOfLines={1}>{currentPlant.room}</Text>
                  </View>
                )}
                {!!currentPlant.location && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText} numberOfLines={1}>{currentPlant.location}</Text>
                  </View>
                )}
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
            <TouchableOpacity style={styles.primaryButton} onPress={handleWaterNow} activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>Water now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleEdit} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Care summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Care summary</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Last watered</Text>
            <Text style={styles.metaValue}>{lastWateredLabel}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Next watering due</Text>
            <Text style={styles.metaValue}>{nextDueLabel}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Watering Frequency</Text>
            <Text style={styles.metaValue}>{intervalLabel}</Text>
          </View>
          <Text style={styles.historySectionTitle}>History</Text>
          <Text style={styles.placeholderText}>Watering log and reminders coming soon.</Text>
        </View>

        {/* Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Room</Text>
            <Text style={styles.metaValue}>{currentPlant.room || "Not set"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Location</Text>
            <Text style={styles.metaValue}>{currentPlant.location || "Not set"}</Text>
          </View>

          <View style={styles.notesBlock}>
            <Text style={styles.metaLabel}>Notes</Text>
            <Text style={styles.notes}>{currentPlant.notes || "No notes yet"}</Text>
          </View>
        </View>          

        {/* Danger zone */}
        <View style={styles.dangerCard}>
          <Text style={styles.dangerLabel}>Danger zone</Text>

          <TouchableOpacity
            style={styles.dangerRow}
            onPress={handleDelete}
            activeOpacity={0.85}
          >
            <View style={styles.dangerRowText}>
              <Text style={styles.dangerRowTitle}>Delete plant</Text>
              <Text style={styles.dangerRowSubtitle} numberOfLines={1}>
                Removes this plant permanently (dummy)
              </Text>
            </View>

            <Ionicons name="trash-outline" size={20} color={colors.error} />
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

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.md,
    marginBottom: spacing.md,
  },
  heroTopRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  heroTextCol: {
    flex: 1,
  },
  heroImageWrap: {
    width: 86,
    height: 86,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
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
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  tag: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },

  primaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.background,
  },
  secondaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
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
    marginBottom: spacing.sm,
  },
  historySectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "700",
  },
  metaValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "800",
  },
  notesBlock: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  notes: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },

  placeholderText: {
    fontSize: 13,
    color: colors.textMuted,
  },

  dangerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.sm,
  },

  dangerLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textMuted,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  dangerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.error,
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
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  dangerRowAction: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.error,
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
