import React from "react";
import { View, Text, StyleSheet, Button } from "react-native";

const RegisterScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <Text style={styles.subtitle}>Placeholder register screen</Text>
      <Button title="Create account (does nothing yet)" onPress={() => {}} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#f1f1f1",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    color: "#22c55e",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#0f0f0fff",
    marginBottom: 16,
  },
});

export default RegisterScreen;
