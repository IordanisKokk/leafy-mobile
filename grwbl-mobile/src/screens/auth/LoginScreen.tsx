
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import Header from "../../components/Header";
import { colors, spacing, radius, boxShadows } from "../../theme";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PlantsStackParamList } from "../../navigation/PlantsStackNavigator";
import { AuthStackParamList } from "../../navigation/AuthStackNavigator";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "../../context/SnackbarContext";
import { LoginRequestError } from "../../api/auth";
import FormField from "../../components/FormField";


type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<boolean>(false);

  const { showSnackbar } = useSnackbar();

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      const typedErr = err as LoginRequestError;

      if (typedErr?.errorType === "credentials") {
        showSnackbar({
          message: typedErr.errorMessage || "Wrong email or password.",
          type: "error",
          duration: 2000,

        });
      } else {
        showSnackbar({
          message: typedErr?.errorMessage || "Could not connect. Please try again.",
          type: "error",
          duration: 2000,

        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToRegister = () => {
    navigation.navigate("Register");
  };

  return (
    <View style={styles.container}>
      <Header title="Welcome" showBackButton={false} showLogo={true} hide={false} />

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* <Text style={styles.title}>Sign in</Text> */}
        <Text style={styles.subtitle}>Sign in to sync your plants and tasks.</Text>

        <View style={styles.card}>
          <FormField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@domain.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <FormField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          <TouchableOpacity style={loading ? styles.buttonDisabled : styles.button} disabled={loading} onPress={handleLogin}>
            <Text style={styles.buttonText}>{loading ? "" : "Log in"}</Text>
            {loading && <ActivityIndicator color={colors.primary} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleNavigateToRegister()}
            style={styles.linkWrap}
          >
            <Text style={styles.linkText}>Don’t have an account? Register</Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    alignItems: "flex-start",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: boxShadows.md,
  },
  button: {
    flexDirection: "row",
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.buttonDisabled,
  },
  buttonText: {
    color: colors.background,
    fontWeight: "600",
  },
  linkWrap: {
    marginTop: spacing.sm,
    alignItems: "center",
  },
  linkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
});

export default LoginScreen;
