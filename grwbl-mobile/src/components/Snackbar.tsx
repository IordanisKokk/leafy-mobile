// src/components/Snackbar.tsx
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, Pressable, View } from "react-native";

export type SnackbarType = "info" | "error" | "success";

type Props = {
  visible: boolean;
  message: string;
  type?: SnackbarType;
  actionLabel?: string;
  onAction?: () => void;
  onHide?: () => void;
};

export const Snackbar: React.FC<Props> = ({
  visible,
  message,
  type = "info",
  actionLabel,
  onAction,
  onHide,
}) => {
  const translateY = useRef(new Animated.Value(500)).current; // start off-screen

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 80,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  if (!message) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }] },
        type === "error" && styles.error,
        type === "success" && styles.success,
      ]}
    >
      <View style={styles.inner}>
        <Pressable style={styles.messageWrap} onPress={onHide} hitSlop={8}>
          <Text style={styles.text}>{message}</Text>
        </Pressable>
        {actionLabel && onAction ? (
          <Pressable
            onPress={() => {
              onAction();
              onHide?.();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24, // sits above tab bar nicely
    borderRadius: 8,
    // basic default look; we can polish later
    backgroundColor: "#333",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  messageWrap: {
    flex: 1,
  },
  text: {
    color: "#fff",
  },
  actionText: {
    color: "#fff",
    fontWeight: "700",
  },
  error: {
    backgroundColor: "#c0392b",
  },
  success: {
    backgroundColor: "#27ae60",
  },
});
