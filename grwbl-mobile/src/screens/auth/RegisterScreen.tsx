import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import Header from "../../components/Header";
import { AuthStackParamList } from "../../navigation/AuthStackNavigator";
import { colors, spacing, radius, boxShadows } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "../../context/SnackbarContext";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successfulRequest, setSuccessfulRequest] = useState(false);

  const { showSnackbar } = useSnackbar();

  const handleRegister = async () => {
    if (loading) return;
    setLoading(true);    // Implement registration logic here
    console.info("Register pressed", { name, email, password, confirmPassword });
    if (password !== confirmPassword) {
      console.warn("Passwords do not match");
      return;
    }
    try {
      register(name, email, password)
        .then(() => {
          console.log("Registration successful");
          showSnackbar({
            message: "Registration successful! Please log in.",
            type: "success",
            duration: 2000,
          });
          setTimeout(() => {
            navigation.navigate("Login");
          }, 2000);
        })
        .catch((error) => {
          console.log("Registration failed:", error);
          showSnackbar({
            message: error?.message || `Registration failed. ${error.errorMessage}.`,
            type: "error",
            duration: 2000,
          });
        });
    } catch (error) {
      console.error("Unexpected error during registration:", error);
      showSnackbar({
        message: "An unexpected error occurred. Please try again.",
        type: "error",
        duration: 2000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToLogin = () => {
    navigation.navigate("Login");
  };

  return (
    <View style={styles.container}>
      <Header title="Create account" showBackButton={false} showLogo={true} hide={false} />

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* <Text style={styles.title}>Register</Text> */}
        <Text style={styles.subtitle}>Create an account to sync your plants across devices.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#64748b"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="you@domain.com"
            placeholderTextColor="#64748b"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="Choose a password"
            placeholderTextColor="#64748b"
            secureTextEntry
          />

          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={styles.input}
            placeholder="Repeat password"
            placeholderTextColor="#64748b"
            secureTextEntry
          />

          <TouchableOpacity style={loading ? styles.buttonDisabled : styles.button} disabled={loading} onPress={handleRegister}>
            <Text style={styles.buttonText}>{loading ? "" : "Create Account"}</Text>
            {loading && <ActivityIndicator color={colors.primary} />}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNavigateToLogin} style={styles.linkWrap}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
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
    boxShadow: boxShadows.md,
  },
  label: {
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    color: colors.text,
    backgroundColor: colors.background,
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

export default RegisterScreen;
