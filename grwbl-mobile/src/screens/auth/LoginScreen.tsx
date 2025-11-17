
import React from "react";
import { View, Text, StyleSheet, Button } from "react-native";

const LoginScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Text style={styles.subtitle}>Placeholder login screen</Text>
      <Button title="Log in (does nothing yet)" onPress={() => { console.info("Log in button pressed"); }} />
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
    color: "#0c0c0cff",
    marginBottom: 16,
  },
});

export default LoginScreen;
