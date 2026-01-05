import "react-native-gesture-handler";
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from "./src/context/AuthContext";
import { SnackbarProvider } from "./src/context/SnackbarContext";

export default function App() {
  return (
    <SnackbarProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SnackbarProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
