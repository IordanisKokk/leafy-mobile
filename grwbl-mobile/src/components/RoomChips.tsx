import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { roomOptions } from "../constants/rooms";
import { colors, radius, spacing } from "../theme";

type Props = {
  selectedRoom?: string;
  onSelect: (room: string) => void;
  allowClear?: boolean;
};

const RoomChips: React.FC<Props> = ({
  selectedRoom,
  onSelect,
  allowClear = true,
}) => {
  return (
    <View style={styles.wrap}>
      {roomOptions.map((room) => {
        const isSelected = room === selectedRoom;
        return (
          <TouchableOpacity
            key={room}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(isSelected && allowClear ? "" : room)}
            activeOpacity={0.85}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {room}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}14`,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: "700",
  },
});

export default RoomChips;
