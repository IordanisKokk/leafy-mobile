// src/screens/HomeScreen.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const HomeScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>grwbl 🌱</Text>
      <Text style={styles.subtitle}>Welcome to your plant buddy app</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#020617", // near-black / slate
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 12,
    color: "#22c55e", // green accent vibe
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#e5e7eb",
  },
});

export default HomeScreen;
