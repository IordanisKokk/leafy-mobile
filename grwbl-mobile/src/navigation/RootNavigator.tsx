import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import AuthStackNavigator from "./AuthStackNavigator";
import MainTabNavigator from "./MainTabNavigator";
import { useAuth } from "../context/AuthContext";

const RootNavigator: React.FC = () => {
  const { token, isHydrating } = useAuth();
  const isLoggedIn = !!token;

  if (isHydrating) {
    return null;
  }

  return (
    <NavigationContainer>
      {isLoggedIn ? <MainTabNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
};

export default RootNavigator;
