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
import { colors, spacing } from "../../theme";
import { AuthStackParamList } from "../../navigation/AuthStackNavigator";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "../../context/SnackbarContext";
import { LoginRequestError } from "../../api/auth";
import {
  AuthFormCard,
  AuthHeroCard,
  AuthSwitchLink,
  AuthTextInput,
  PrimaryButton,
} from "./components/AuthUI";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    if (loading) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      setFormError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setFormError(null);

    try {
      await login(trimmedEmail, password);
    } catch (err) {
      const typedErr = err as LoginRequestError;
      const credentialsError = typedErr?.errorType === "credentials";
      const message = credentialsError
        ? "That email or password doesn't look right."
        : "Could not connect right now. Please try again.";

      setFormError(message);
      showSnackbar({
        message,
        type: "error",
        duration: 2200,
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
            title="Welcome back"
            body="Your green buddies missed you."
            icon="water-outline"
          />

          <AuthFormCard>
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
              placeholder="Password"
              secureTextEntry
              secureToggle
              textContentType="password"
              autoCapitalize="none"
              autoCorrect={false}
              errorText={formError ?? undefined}
            />

            <PrimaryButton label="Log in" loading={loading} onPress={handleLogin} />

            <AuthSwitchLink
              text="Don't have an account?"
              actionText="Register"
              onPress={() => navigation.navigate("Register")}
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

export default LoginScreen;
