import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, boxShadows } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { post } from "../../api/client";

const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { logout, token } = useAuth();
  const [isSendingExpoTest, setIsSendingExpoTest] = React.useState(false);
  const [isSendingNativeTest, setIsSendingNativeTest] = React.useState(false);
  const [isSendingLocalTest, setIsSendingLocalTest] = React.useState(false);
  const [localTitle, setLocalTitle] = React.useState("Water your plants");
  const [localBody, setLocalBody] = React.useState("This is a local notification preview.");
  const [notificationDebug, setNotificationDebug] = React.useState<string>("");

  const handleLogoutPress = () => {
    console.log("Logout pressed");
    logout();
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
      return true;
    }

    const next = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return next.granted || next.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  };

  const getExpoPushToken = async (): Promise<string> => {
    const envProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
    const projectId =
      envProjectId ??
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      throw new Error(
        "Missing EAS projectId. Set EXPO_PUBLIC_EAS_PROJECT_ID or app.json expo.extra.eas.projectId.",
      );
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });

    return tokenResponse.data;
  };

  const getNativePushToken = async (): Promise<{ token: string; provider: "apns" | "fcm" }> => {
    const native = await Notifications.getDevicePushTokenAsync();
    const provider = Platform.OS === "ios" ? "apns" : "fcm";
    const tokenValue = typeof native.data === "string" ? native.data : JSON.stringify(native.data);
    return { token: tokenValue, provider };
  };

  const sendExpoPushToSelf = async () => {
    setIsSendingExpoTest(true);
    setNotificationDebug("");
    try {
      const allowed = await requestNotificationPermission();
      if (!allowed) {
        setNotificationDebug("Notification permission denied.");
        return;
      }

      const expoToken = await getExpoPushToken();
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: expoToken,
          title: "Expo push test",
          body: "This test came from Expo Push Service.",
          data: { source: "settings_test", provider: "expo" },
          sound: "default",
        }),
      });

      const payload = (await response.json()) as { data?: unknown; errors?: unknown };
      if (!response.ok) {
        setNotificationDebug(`Expo push failed: HTTP ${response.status}`);
        return;
      }

      setNotificationDebug(`Expo push queued. Token: ${expoToken.slice(0, 16)}...`);
      console.log("Expo push response:", payload);
    } catch (error) {
      console.error("Expo push test failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("projectid")) {
        setNotificationDebug(
          "Expo push requires EAS projectId. Configure EXPO_PUBLIC_EAS_PROJECT_ID or app.json extra.eas.projectId.",
        );
      } else {
        setNotificationDebug("Expo push test failed. Check logs and token setup.");
      }
    } finally {
      setIsSendingExpoTest(false);
    }
  };

  const sendLocalNotificationPreview = async () => {
    setIsSendingLocalTest(true);
    setNotificationDebug("");
    try {
      const allowed = await requestNotificationPermission();
      if (!allowed) {
        setNotificationDebug("Notification permission denied.");
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: localTitle.trim() || "Water your plants",
          body: localBody.trim() || "This is a local notification preview.",
          sound: "default",
          data: { source: "settings_local_preview" },
        },
        trigger: null,
      });

      setNotificationDebug("Local notification scheduled and should appear immediately.");
    } catch (error) {
      console.error("Local notification preview failed:", error);
      setNotificationDebug("Local notification preview failed. Check permission settings.");
    } finally {
      setIsSendingLocalTest(false);
    }
  };

  const sendNativePushViaBackend = async () => {
    setIsSendingNativeTest(true);
    setNotificationDebug("");
    try {
      if (!token) {
        setNotificationDebug("You need to be signed in to test backend native push.");
        return;
      }

      const allowed = await requestNotificationPermission();
      if (!allowed) {
        setNotificationDebug("Notification permission denied.");
        return;
      }

      const native = await getNativePushToken();
      const response = await post<{ message?: string }>("/notifications/test/native", {
        token: native.token,
        provider: native.provider,
        title: "Native push test",
        body: `This test should be sent through ${native.provider.toUpperCase()}.`,
        data: { source: "settings_test", provider: native.provider },
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setNotificationDebug(
          response.status === 404
            ? "Backend endpoint /notifications/test/native is not implemented yet."
            : `Native push request failed (HTTP ${response.status}).`,
        );
        return;
      }

      setNotificationDebug(
        response.data?.message ??
          `Native push request accepted (${native.provider.toUpperCase()}).`,
      );
    } catch (error) {
      console.error("Native push backend test failed:", error);
      setNotificationDebug("Native push test failed. Check backend logs.");
    } finally {
      setIsSendingNativeTest(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ height: insets.top + spacing.sm }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>General</Text>

          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <View>
              <Text style={styles.rowTitle}>Account</Text>
              <Text style={styles.rowSubtitle}>
                Manage your profile (placeholder)
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <View>
              <Text style={styles.rowTitle}>Notifications</Text>
              <Text style={styles.rowSubtitle}>
                Watering reminders and tips
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <View>
              <Text style={styles.rowTitle}>Theme</Text>
              <Text style={styles.rowSubtitle}>
                Light / dark (coming soon)
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.section, styles.sectionSpacing]}>
          <Text style={styles.sectionLabel}>Notification tests</Text>
          <Text style={styles.helperText}>
            Use these to validate push flows from the app before wiring production schedules.
          </Text>

          <View style={styles.localPreviewCard}>
            <Text style={styles.localPreviewTitle}>Local notification preview (no backend)</Text>
            <Text style={styles.localPreviewSubtitle}>
              Write text below and trigger an on-device notification immediately.
            </Text>
            <TextInput
              value={localTitle}
              onChangeText={setLocalTitle}
              placeholder="Notification title"
              placeholderTextColor="#64748b"
              style={styles.localInput}
              maxLength={80}
            />
            <TextInput
              value={localBody}
              onChangeText={setLocalBody}
              placeholder="Notification body"
              placeholderTextColor="#64748b"
              style={[styles.localInput, styles.localInputBody]}
              multiline
              maxLength={180}
            />
            <TouchableOpacity
              style={[styles.localSendButton, isSendingLocalTest && styles.testButtonDisabled]}
              onPress={sendLocalNotificationPreview}
              activeOpacity={0.85}
              disabled={isSendingLocalTest}
            >
              {isSendingLocalTest ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <Ionicons name="notifications-outline" size={18} color={colors.background} />
                  <Text style={styles.localSendButtonText}>Send local preview</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.testButton, isSendingExpoTest && styles.testButtonDisabled]}
            onPress={sendExpoPushToSelf}
            activeOpacity={0.85}
            disabled={isSendingExpoTest}
          >
            <View style={styles.testButtonTextWrap}>
              <Text style={styles.testButtonTitle}>Send test via Expo Push Service</Text>
              <Text style={styles.testButtonSubtitle}>
                Registers Expo token and sends a push to this device.
              </Text>
            </View>
            {isSendingExpoTest ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Ionicons name="paper-plane-outline" size={18} color={colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, isSendingNativeTest && styles.testButtonDisabled]}
            onPress={sendNativePushViaBackend}
            activeOpacity={0.85}
            disabled={isSendingNativeTest}
          >
            <View style={styles.testButtonTextWrap}>
              <Text style={styles.testButtonTitle}>Send test via direct APNs/FCM</Text>
              <Text style={styles.testButtonSubtitle}>
                Sends native device token to backend endpoint for direct provider delivery.
              </Text>
            </View>
            {isSendingNativeTest ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Ionicons name="server-outline" size={18} color={colors.primary} />
            )}
          </TouchableOpacity>

          {notificationDebug ? (
            <View style={styles.debugMessageCard}>
              <Text style={styles.debugMessageText}>{notificationDebug}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.section, styles.sectionSpacing]}>
          <TouchableOpacity style={styles.row} onPress={handleLogoutPress} activeOpacity={0.7}>
            <View>
              <Text style={styles.logoutLabel}>Log out</Text>
            </View>
            <Ionicons
              name="log-out-outline"
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingBottom: spacing.xxxl,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.md,
  },
  sectionSpacing: {
    marginTop: spacing.xl,
  },
  sectionLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  row: {
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowTitle: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "500",
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  helperText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  localPreviewCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  localPreviewTitle: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "700",
  },
  localPreviewSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.sm,
    lineHeight: 17,
  },
  localInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  localInputBody: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  localSendButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  localSendButtonText: {
    fontSize: 14,
    color: colors.background,
    fontWeight: "700",
  },
  testButton: {
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  testButtonDisabled: {
    opacity: 0.7,
  },
  testButtonTextWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  testButtonTitle: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "600",
  },
  testButtonSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 17,
  },
  debugMessageCard: {
    marginTop: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.sm,
  },
  debugMessageText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    fontWeight: "500",
  },
  logoutLabel: {
    fontSize: 15,
    color: colors.error,
    fontWeight: "500",
  }
});

export default SettingsScreen;
