import React from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthStackParamList } from "../../navigation/AuthStackNavigator";
import { colors, spacing } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "../../context/SnackbarContext";
import {
  AuthFormCard,
  AuthHeroCard,
  AuthSwitchLink,
  AuthTextInput,
  PrimaryButton,
} from "./components/AuthUI";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const mapRegisterError = (value: unknown): string => {
    const fallback = "We couldn't create your account right now. Please try again.";
    if (!value || typeof value !== "object") return fallback;

    const err = value as { status?: number; errorMessage?: string; message?: string; errorType?: string };
    const raw = (err.errorMessage ?? err.message ?? "").toLowerCase();

    if (raw.includes("already") || raw.includes("exists") || raw.includes("duplicate")) {
      return "This email is already registered.";
    }

    if (raw.includes("validation") || err.status === 400 || err.errorType === "validation") {
      return "Please check your details and try again.";
    }

    return fallback;
  };

  const handleRegister = async () => {
    if (loading) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password.trim() || !confirmPassword.trim()) {
      setFormError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setFormError(null);

    try {
      await register(trimmedName, trimmedEmail, password);
      showSnackbar({
        message: "Account created. Please sign in.",
        type: "success",
        duration: 2000,
      });
      navigation.navigate("Login");
    } catch (error) {
      const friendlyMessage = mapRegisterError(error);
      setFormError(friendlyMessage);
      showSnackbar({
        message: friendlyMessage,
        type: "error",
        duration: 2300,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 88 },
          ]}
        >
          <AuthHeroCard
            title="Start your plant collection"
            body="Track watering, rooms, notes, and reminders."
            icon="leaf-outline"
          />

          <AuthFormCard>
            <AuthTextInput
              label="Full name"
              leftIcon="person-outline"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoCapitalize="words"
              textContentType="name"
            />

            <AuthTextInput
              label="Email"
              leftIcon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="you@domain.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />

            <AuthTextInput
              label="Password"
              leftIcon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="Choose a password"
              secureTextEntry
              secureToggle
              textContentType="newPassword"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <AuthTextInput
              label="Confirm password"
              leftIcon="lock-closed-outline"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat password"
              secureTextEntry
              secureToggle
              textContentType="password"
              autoCapitalize="none"
              autoCorrect={false}
              errorText={formError ?? undefined}
            />

            <PrimaryButton label="Create account" loading={loading} onPress={handleRegister} />

            <AuthSwitchLink
              text="Already have an account?"
              actionText="Sign in"
              onPress={() => navigation.navigate("Login")}
            />
          </AuthFormCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.xs,
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
});

export default RegisterScreen;
