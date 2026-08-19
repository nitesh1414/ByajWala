import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider, useApp } from './src/context/AppContext';
import RootNav from './src/navigation/RootNav';
import LockScreen from './src/screens/LockScreen';
import { colors } from './src/theme';
import { refreshReminders } from './src/services/notifications';

function Gate() {
  const { ready, settings } = useApp();
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (ready) refreshReminders().catch(() => {});
  }, [ready]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (settings.pin_enabled === '1' && !unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }
  return <RootNav />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <StatusBar style="dark" />
        <Gate />
      </AppProvider>
    </GestureHandlerRootView>
  );
}
