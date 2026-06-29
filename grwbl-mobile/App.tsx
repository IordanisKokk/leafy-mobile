import "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { SnackbarProvider } from "./src/context/SnackbarContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  return (
    <SnackbarProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SnackbarProvider>
  );
}
