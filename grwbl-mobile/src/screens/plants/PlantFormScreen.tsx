import React, { useState } from "react";
import { View, Text, StyleSheet, Image, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PlantsStackParamList } from "../../navigation/PlantsStackNavigator";
import { boxShadows, colors, radius, spacing } from "../../theme";
import Header from "../../components/Header";
import { Ionicons } from "@expo/vector-icons";
import { Species } from "../../api/species";
import { savePlant } from "../../api/plants";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "../../context/SnackbarContext";
import RoomChips from "../../components/RoomChips";
import FormField from "../../components/FormField";

type Props = NativeStackScreenProps<PlantsStackParamList, "PlantForm">;

type PlantDraft = {
  nickname: string;
  room: string;
  location: string;
  wateringFrequencyDays: number;
  lastWateredAt: string;
  notes: string;
  speciesId: string;
};

const PlantFormScreen: React.FC<Props> = ({ route, navigation }) => {
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const { species } = route.params;
  const [plant, setPlant] = useState<PlantDraft>({
    nickname: "",
    room: "",
    location: "",
    wateringFrequencyDays: species.defaultWateringIntervalDays,
    lastWateredAt: "",
    notes: "",
    speciesId: species.id,
  });

  const auth = useAuth();
  const { showSnackbar } = useSnackbar();

  const padDatePart = (value: number): string => String(value).padStart(2, "0");

  const isValidDateParts = (day: number, month: number, year: number): boolean => {
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  const normalizeDateInput = (
    value: string,
  ): { value: string | null; error?: string } => {
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

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return {
        value: `${parsed.getFullYear()}-${padDatePart(parsed.getMonth() + 1)}-${padDatePart(parsed.getDate())}`,
      };
    }

    return { value: null, error: "Enter a valid date" };
  };

  const handleSavePlant = async () => {
    console.log("Saving plant:", plant);
    const dateResult = normalizeDateInput(plant.lastWateredAt);
    if (dateResult.error) {
      showSnackbar({ message: "Enter a valid last watered date", type: "error", duration: 2000 });
      return;
    }
    const plantToSave = {
      "name": plant.nickname,
      "speciesId": plant.speciesId,
      "room": plant.room,
      "location": plant.location,
      "wateringFrequencyDays": plant.wateringFrequencyDays,
      "lastWateredAt": dateResult.value,
      "notes": plant.notes,
    }
    try {
      await savePlant(plantToSave, auth.token);
      navigation.navigate("PlantsList");
    } catch (err) {
      console.error("savePlant failed:", err);
      const msg = err instanceof Error ? err.message : String(err);

      if (msg.includes("401") || msg.includes("403")) {
        auth.logout?.();
      }

      showSnackbar({ message: "Could not save plant. Please try again.", type: "error", duration: 2000 });
    }
  }

  const updateDraft = <K extends keyof PlantDraft>(key: K, value: PlantDraft[K]) => {
    setPlant((prev) => ({ ...prev, [key]: value }));
  };

  const petChipColors = (isToxic: boolean) => {
    return {
      backgroundColor: isToxic ? "#fdecea" : "#e6f4ea",
      borderColor: isToxic ? "#e74c3c" : "#27ae60",
      textColor: isToxic ? "#c0392b" : "#1e8449",
    };
  };

  const wateringChipColors = (intervalDays: number) => {
    if (intervalDays <= 3) {
      return { backgroundColor: "#e0f2fe", borderColor: "#0ea5e9", textColor: "#0369a1" };
    }
    if (intervalDays <= 7) {
      return { backgroundColor: "#e0f2fe", borderColor: "#38bdf8", textColor: "#075985" };
    }
    if (intervalDays <= 14) {
      return { backgroundColor: "#e0f2fe", borderColor: "#7dd3fc", textColor: "#0c4a6e" };
    }
    return { backgroundColor: "#eff6ff", borderColor: "#93c5fd", textColor: "#1d4ed8" };
  };

  const lightChipColors = () => ({
    backgroundColor: "#f5f3ff",
    borderColor: "#c4b5fd",
    textColor: "#5b21b6",
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header title="New plant" showBackButton={true} showLogo={false} hide={false} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.speciesCard}>
          <View style={styles.speciesTopRow}>
            <Image source={{ uri: species.imageUrl }} style={styles.speciesImage} />
            <View style={styles.speciesInfo}>
              <Text style={styles.commonName}>{species.commonName}</Text>
              <Text style={styles.scientificName}>{species.scientificName}</Text>
              <Text style={styles.description}>{species.description}</Text>
            </View>
          </View>
          <View style={styles.tagsRow}>
            {(() => {
              const waterColors = wateringChipColors(species.defaultWateringIntervalDays);
              return (
                <View
                  style={[
                    styles.tag,
                    {
                      backgroundColor: waterColors.backgroundColor,
                      borderColor: waterColors.borderColor,
                    },
                  ]}
                >
                  <Text style={[styles.tagText, { color: waterColors.textColor }]}>
                    Water: {species.defaultWateringIntervalDays}d
                  </Text>
                </View>
              );
            })()}
            {(() => {
              const lightColors = lightChipColors();
              return (
                <View
                  style={[
                    styles.tag,
                    {
                      backgroundColor: lightColors.backgroundColor,
                      borderColor: lightColors.borderColor,
                    },
                  ]}
                >
                  <Text style={[styles.tagText, { color: lightColors.textColor }]}>
                    Light: {species.careInstructions.light}
                  </Text>
                </View>
              );
            })()}
            {(() => {
              const petColors = petChipColors(species.properties.isToxicToPets);
              return (
                <View
                  style={[
                    styles.tag,
                    {
                      backgroundColor: petColors.backgroundColor,
                      borderColor: petColors.borderColor,
                    },
                  ]}
                >
                  <Text style={[styles.tagText, { color: petColors.textColor }]}>
                    {species.properties.isToxicToPets ? "Toxic to pets" : "Pet safe"}
                  </Text>
                </View>
              );
            })()}
          </View>
          <Text style={styles.meta}>
            Origin: {species.properties.nativeRegion} · Soil: {species.careInstructions.soil}
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Basics</Text>
          <FormField
            label="Nickname"
            placeholder={`e.g. Living room ${species.commonName}`}
            value={plant.nickname}
            onChangeText={(text) => updateDraft("nickname", text)}
          />

          <View style={styles.roomField}>
            <Text style={styles.fieldLabel}>Room</Text>
            <RoomChips
              selectedRoom={selectedRoom}
              onSelect={(room) => {
                setSelectedRoom(room);
                setPlant((prev) => ({ ...prev, room }));
              }}
            />
          </View>

          <FormField
            label="Location"
            placeholder="e.g. North window shelf"
            value={plant.location}
            onChangeText={(text) => updateDraft("location", text)}
          />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Care</Text>
          <FormField
            label="Watering frequency (days)"
            placeholder={`${species.defaultWateringIntervalDays} (species default)`}
            keyboardType="numeric"
            inputMode="numeric"
            value={
              plant.wateringFrequencyDays !== undefined && plant.wateringFrequencyDays !== null
                ? String(plant.wateringFrequencyDays)
                : ""
            }
            onChangeText={(text) =>
              updateDraft("wateringFrequencyDays", Number(text) || 0)
            }
          />

          <FormField
            label="Last watered at"
            placeholder="DD-MM-YYYY"
            inputMode="numeric"
            value={plant.lastWateredAt}
            onChangeText={(text) => updateDraft("lastWateredAt", text)}
          />

          <FormField
            label="Notes"
            placeholder="Care notes, light conditions, etc."
            multiline
            value={plant.notes}
            onChangeText={(text) => updateDraft("notes", text)}
            style={styles.notesInput}
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={() => handleSavePlant()}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Text style={styles.buttonText}>Save Plant</Text>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.background} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: spacing.sm,
    color: colors.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  species: {
    fontWeight: "700",
    color: colors.text,
  },
  speciesCard: {
    flexDirection: "column",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.md,
    gap: spacing.sm,
  },
  speciesTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  speciesImage: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    marginRight: spacing.md,
    backgroundColor: colors.background,
  },
  speciesInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  commonName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  scientificName: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    marginBottom: spacing.xs,
    color: colors.textMuted,
    fontWeight: "700",
  },
  roomField: {
    marginBottom: spacing.md,
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.background,
  },
});


export default PlantFormScreen;
