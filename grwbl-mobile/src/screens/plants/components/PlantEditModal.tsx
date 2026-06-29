import React from "react";
import {
  Modal,
  Pressable,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { boxShadows, colors, radius, spacing } from "../../../theme";
import RoomChips from "../../../components/RoomChips";
import FormField from "../../../components/FormField";

export type EditDraft = {
  name: string;
  room: string;
  location: string;
  wateringFrequencyDays: string;
  lastWateredAt: string;
  notes: string;
};

type Props = {
  visible: boolean;
  draft: EditDraft;
  onChange: <K extends keyof EditDraft>(key: K, value: EditDraft[K]) => void;
  onClose: () => void;
  onSave: () => void;
};

const PlantEditModal: React.FC<Props> = ({
  visible,
  draft,
  onChange,
  onClose,
  onSave,
}) => {
  const selectedRoom = draft.room;
  const [showAndroidLastWateredPicker, setShowAndroidLastWateredPicker] = React.useState(false);
  const [showIosLastWateredPicker, setShowIosLastWateredPicker] = React.useState(false);
  const [lastWateredPickerDate, setLastWateredPickerDate] = React.useState<Date>(new Date());

  const padDatePart = (value: number): string => String(value).padStart(2, "0");
  const formatDateForInput = (date: Date): string =>
    `${padDatePart(date.getDate())}-${padDatePart(date.getMonth() + 1)}-${date.getFullYear()}`;

  const parseDraftDate = (value: string): Date => {
    const trimmed = value.trim();
    if (!trimmed) return new Date();

    const dayMonthYear = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dayMonthYear) {
      const day = Number.parseInt(dayMonthYear[1], 10);
      const month = Number.parseInt(dayMonthYear[2], 10);
      const year = Number.parseInt(dayMonthYear[3], 10);
      const parsed = new Date(year, month - 1, day);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const isoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDate) {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const fallback = new Date(trimmed);
    if (!Number.isNaN(fallback.getTime())) return fallback;
    return new Date();
  };

  const openLastWateredPicker = () => {
    const nextDate = parseDraftDate(draft.lastWateredAt);
    setLastWateredPickerDate(nextDate);
    if (Platform.OS === "ios") {
      setShowIosLastWateredPicker(true);
      return;
    }
    setShowAndroidLastWateredPicker(true);
  };

  const handleLastWateredChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowAndroidLastWateredPicker(false);
      if (event.type !== "set" || !selectedDate) {
        return;
      }
      onChange("lastWateredAt", formatDateForInput(selectedDate));
      return;
    }

    if (!selectedDate) return;
    setLastWateredPickerDate(selectedDate);
  };

  React.useEffect(() => {
    if (Platform.OS !== "ios") return;
    setLastWateredPickerDate(parseDraftDate(draft.lastWateredAt));
  }, [draft.lastWateredAt]);

  const closeIosDateSheet = () => {
    setShowIosLastWateredPicker(false);
  };

  const confirmIosDateSheet = () => {
    onChange("lastWateredAt", formatDateForInput(lastWateredPickerDate));
    setShowIosLastWateredPicker(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      {...(Platform.OS === "ios" ? { presentationStyle: "overFullScreen" } : {})}
      statusBarTranslucent={Platform.OS === "android"}
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheetCard} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderText}>
              <Text style={styles.sheetTitle}>Edit plant</Text>
              <Text style={styles.sheetSubtitle}>Update nickname, care, and notes.</Text>
            </View>
            <TouchableOpacity
              style={styles.sheetClose}
              onPress={onClose}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.editScroll}
            contentContainerStyle={styles.editContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Basics</Text>
              <FormField
                label="Nickname"
                value={draft.name}
                onChangeText={(text) => onChange("name", text)}
                placeholder="e.g. Living room fern"
              />

              <View style={styles.roomField}>
                <Text style={styles.fieldLabel}>Room</Text>
                <RoomChips
                  selectedRoom={selectedRoom}
                  onSelect={(room) => onChange("room", room)}
                />
              </View>

              <FormField
                label="Location"
                value={draft.location}
                onChangeText={(text) => onChange("location", text)}
                placeholder="e.g. North window"
              />
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Care</Text>
              <FormField
                label="Watering frequency (days)"
                value={draft.wateringFrequencyDays}
                onChangeText={(text) =>
                  onChange("wateringFrequencyDays", text.replace(/[^0-9]/g, ""))
                }
                placeholder="7"
                keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                returnKeyType="done"
                maxLength={2}
              />

              <View style={styles.dateFieldWrap}>
                <Text style={styles.fieldLabel}>Last watered</Text>
                <Pressable
                  style={styles.dateFieldButton}
                  onPress={openLastWateredPicker}
                  accessibilityRole="button"
                  accessibilityLabel="Select last watered date"
                >
                  <Text style={[styles.dateFieldText, !draft.lastWateredAt && styles.dateFieldPlaceholder]}>
                    {draft.lastWateredAt || "Select date"}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <FormField
                label="Notes"
                value={draft.notes}
                onChangeText={(text) => onChange("notes", text)}
                placeholder="Care notes, light conditions, etc."
                multiline
                style={styles.notesInput}
              />
            </View>
          </ScrollView>

          <View style={styles.modalButtonsRow}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={onSave}
              activeOpacity={0.85}
            >
              <Text style={styles.modalButtonPrimaryText}>Save</Text>
            </TouchableOpacity>
          </View>

          {Platform.OS === "ios" && showIosLastWateredPicker ? (
            <View style={styles.innerDateSheetOverlay}>
              <Pressable style={styles.innerDateSheetBackdrop} onPress={closeIosDateSheet} />
              <View style={styles.innerDateSheetCard}>
                <View style={styles.innerDateSheetHeader}>
                  <TouchableOpacity onPress={closeIosDateSheet} activeOpacity={0.8}>
                    <Text style={styles.innerDateSheetCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.innerDateSheetTitle}>Last watered date</Text>
                  <TouchableOpacity onPress={confirmIosDateSheet} activeOpacity={0.8}>
                    <Text style={styles.innerDateSheetDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  style={styles.innerDateSheetPicker}
                  value={lastWateredPickerDate}
                  mode="date"
                  display="inline"
                  themeVariant="light"
                  maximumDate={new Date()}
                  onChange={handleLastWateredChange}
                />
              </View>
            </View>
          ) : null}
        </Pressable>
      </Pressable>

      {Platform.OS === "android" && showAndroidLastWateredPicker ? (
        <DateTimePicker
          value={lastWateredPickerDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleLastWateredChange}
        />
      ) : null}
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    maxHeight: "85%",
    overflow: "hidden",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
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
  editScroll: {
    marginTop: spacing.md,
  },
  editContent: {
    paddingBottom: spacing.xl,
  },
  sectionBlock: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.md,
    letterSpacing: 0.4,
  },
  roomField: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  dateFieldWrap: {
    marginBottom: spacing.md,
  },
  dateFieldButton: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateFieldText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  dateFieldPlaceholder: {
    color: "#64748b",
  },
  innerDateSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 1000,
  },
  innerDateSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${colors.text}73`,
  },
  innerDateSheetCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  innerDateSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  innerDateSheetTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  innerDateSheetCancel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
  },
  innerDateSheetDone: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
  },
  innerDateSheetPicker: {
    alignSelf: "stretch",
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  modalButtonsRow: {
    marginTop: spacing.md,
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

export default PlantEditModal;
