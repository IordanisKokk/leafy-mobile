import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import AuthStackNavigator from "./AuthStackNavigator";
import MainTabNavigator from "./MainTabNavigator";
import { useAuth } from "../context/AuthContext";

const RootNavigator: React.FC = () => {
  const { token } = useAuth();
  const isLoggedIn = !!token;

  return (
    <NavigationContainer>
      {isLoggedIn ? <MainTabNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
};

export default RootNavigator;
