import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import AuthStackNavigator from "./AuthStackNavigator";
import MainTabNavigator from "./MainTabNavigator";

const RootNavigator: React.FC = () => {
  // For now, just hardcode this.
  // Later this will come from context / async storage / API.
  const isLoggedIn = true; // toggle to true to test the main tabs

  return (
    <NavigationContainer>
      {isLoggedIn ? <MainTabNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
};

export default RootNavigator;
