// src/navigation/PlantsStackNavigator.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PlantsListScreen from "../screens/plants/PlantsListScreen";
import SelectSpeciesScreen from "../screens/plants/SelectSpeciesScreen";
import PlantFormScreen from "../screens/plants/PlantFormScreen";
import PlantDetailsScreen from "../screens/plants/PlantDetailsScreen";
import { colors, spacing, radius } from "../theme";
import { Species } from "../api/species";
import { Plant } from "../api/plants";


export type PlantsStackParamList = {
  PlantsList: undefined;
  SelectSpecies: undefined;
  PlantForm: { species: Species };
  PlantDetails: { plant: Plant };
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
      <Stack.Screen
        name="PlantDetails"
        component={PlantDetailsScreen}
        options={{ title: "Plant" }}
      />
    </Stack.Navigator>
  );
};

export default PlantsStackNavigator;
