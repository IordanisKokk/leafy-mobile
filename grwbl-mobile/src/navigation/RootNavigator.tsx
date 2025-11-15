
// src/navigation/RootNavigator.tsx
import React from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import HomeScreen from "../screens/HomeScreen";

const RootNavigator: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <HomeScreen />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
});

export default RootNavigator;
