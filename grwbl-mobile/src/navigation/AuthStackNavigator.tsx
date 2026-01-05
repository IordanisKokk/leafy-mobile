import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

const Tab = createBottomTabNavigator<AuthStackParamList>();

const AuthStackNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Login") {
            iconName = focused ? "log-in" : "log-in-outline";
          } else if (route.name === "Register") {
            iconName = focused ? "person-add" : "person-add-outline";
          } else {
            // Settings
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: "Login" }}
      />
      <Tab.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: "Register" }}
      />
    </Tab.Navigator>
  );
};

export default AuthStackNavigator;
