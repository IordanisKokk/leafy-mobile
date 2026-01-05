// src/navigation/PlantsStackNavigator.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PlantsListScreen from "../screens/plants/PlantsListScreen";
import SelectSpeciesScreen from "../screens/plants/SelectSpeciesScreen";
import PlantFormScreen from "../screens/plants/PlantFormScreen";
import { colors, spacing, radius } from "../theme";
import { Species } from "../api/species";


export type PlantsStackParamList = {
  PlantsList: undefined;
  SelectSpecies: undefined;
  PlantForm: { species: Species };
};

const Stack = createNativeStackNavigator<PlantsStackParamList>();

const PlantsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false
      }}
    >
      <Stack.Screen
        name="PlantsList"
        component={PlantsListScreen}
        options={{
          headerShown: false, // root stays full-bleed, like now
        }}
      />
      <Stack.Screen
        name="SelectSpecies"
        component={SelectSpeciesScreen}
        options={{ title: "Select species" }}
      />
      <Stack.Screen
        name="PlantForm"
        component={PlantFormScreen}
        options={{ title: "New plant" }}
      />
    </Stack.Navigator>
  );
};

export default PlantsStackNavigator;
