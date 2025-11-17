import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import TodayScreen from "../screens/main/TodayScreen";
import SettingsScreen from "../screens/main/SettingsScreen";
import PlantsStackNavigator from "./PlantsStackNavigator";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

export type MainTabParamList = {
  Today: undefined;
  Plants: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
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

          if (route.name === "Today") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "Plants") {
            iconName = focused ? "leaf" : "leaf-outline";
          } else {
            // Settings
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{ title: "Today" }}
      />
      <Tab.Screen
        name="Plants"
        component={PlantsStackNavigator}
        options={{ title: "Plants" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
    </Tab.Navigator>
  );
};


export default MainTabNavigator;
