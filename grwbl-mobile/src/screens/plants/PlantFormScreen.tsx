import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Image, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PlantsStackParamList } from "../../navigation/PlantsStackNavigator";
import { boxShadows, colors, radius, spacing } from "../../theme";
import Header from "../../components/Header";
import { Ionicons } from "@expo/vector-icons";
import { Species } from "../../api/species";
import { savePlant } from "../../api/plants";
import { useAuth } from "../../context/AuthContext";

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
  const roomOptions = [
    "Bedroom",
    "Living Room",
    "Kitchen",
    "Balcony",
    "Hallway",
    "Bathroom",
    "Guest room",
    "Other",
  ];
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [roomDropdownOpen, setRoomDropdownOpen] = useState<boolean>(false);
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

  const handleSavePlant = () => {
    console.log("Saving plant:", plant);
    const plantToSave = {
      "name": plant.nickname,
      "speciesId": plant.speciesId,
      "location": plant.location,
    }
    savePlant(plantToSave, auth.token)
    navigation.navigate("PlantsList");
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
          <Text style={styles.label}>Nickname</Text>
          <TextInput
            style={styles.input}
            placeholder={`e.g. Living room ${species.commonName}`}
            placeholderTextColor="#64748b"
            value={plant.nickname}
            onChangeText={(text) => updateDraft("nickname", text)}
          />

          <Text style={styles.label}>Room</Text>
          <TouchableOpacity
            style={styles.dropdown}
            activeOpacity={0.8}
            onPress={() => setRoomDropdownOpen((prev) => !prev)}
          >
            <Text
              style={
                selectedRoom ? styles.dropdownValue : styles.dropdownPlaceholder
              }
            >
              {selectedRoom || "Select a room"}
            </Text>
            <Text style={styles.dropdownCaret}>
              {roomDropdownOpen ? (
                <Ionicons name="caret-up" size={12} color={colors.primarySoft} />
              ) : (
                <Ionicons name="caret-down" size={12} color={colors.primarySoft} />
              )}
            </Text>
          </TouchableOpacity>
          {roomDropdownOpen && (
            <View style={styles.dropdownOptions}>
              {roomOptions.map((room) => (
                <TouchableOpacity
                  key={room}
                  style={[
                    styles.dropdownOption,
                    selectedRoom === room && styles.dropdownOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedRoom(room);
                    setRoomDropdownOpen(false);
                    setPlant((prev) => ({ ...prev, room }));
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      selectedRoom === room && styles.dropdownOptionTextSelected,
                    ]}
                  >
                    {room}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. North window shelf"
            placeholderTextColor="#64748b"
            value={plant.location}
            onChangeText={(text) => updateDraft("location", text)}
          />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Care</Text>

          <Text style={styles.label}>Watering frequency (days)</Text>
          <TextInput
            style={styles.input}
            placeholder={`${species.defaultWateringIntervalDays} (species default)`}
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            inputMode="numeric"
            value={plant.wateringFrequencyDays.toString()}
            onChangeText={(text) =>
              updateDraft("wateringFrequencyDays", Number(text) || 0)
            }
          />

          <Text style={styles.label}>Last watered at</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD (tap to pick a date)"
            placeholderTextColor="#64748b"
            inputMode="numeric"
            value={plant.lastWateredAt}
            onChangeText={(text) => updateDraft("lastWateredAt", text)}
          />

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Care notes, light conditions, etc."
            placeholderTextColor="#64748b"
            multiline
            value={plant.notes}
            onChangeText={(text) => updateDraft("notes", text)}
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
    borderRadius: radius.lg,
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
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    marginBottom: spacing.xs,
    color: colors.text,
  },
  input: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    color: colors.text,
    backgroundColor: colors.surfaceSoft,
    boxShadow: boxShadows.md,
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.surfaceSoft,
  },
  dropdownPlaceholder: {
    color: "#64748b",
  },
  dropdownValue: {
    color: colors.text,
  },
  dropdownCaret: {
    color: colors.textMuted,
    fontSize: 12,
  },
  dropdownOptions: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  dropdownOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  dropdownOptionSelected: {
    backgroundColor: colors.primary + "10",
  },
  dropdownOptionText: {
    color: colors.text,
  },
  dropdownOptionTextSelected: {
    color: colors.primary,
    fontWeight: "700",
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
