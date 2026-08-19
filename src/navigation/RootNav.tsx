import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { colors } from '../theme';
import DashboardScreen from '../screens/DashboardScreen';
import CustomersScreen from '../screens/CustomersScreen';
import CustomerFormScreen from '../screens/CustomerFormScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import LoansScreen from '../screens/LoansScreen';
import LoanFormScreen from '../screens/LoanFormScreen';
import LoanDetailScreen from '../screens/LoanDetailScreen';
import InstallmentScreen from '../screens/InstallmentScreen';
import PaymentFormScreen from '../screens/PaymentFormScreen';
import SettlementScreen from '../screens/SettlementScreen';
import RecoveryScreen from '../screens/RecoveryScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ReceiptScreen from '../screens/ReceiptScreen';
import StatementScreen from '../screens/StatementScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SearchScreen from '../screens/SearchScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Icon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 10, fontWeight: '700', color: focused ? colors.primary : colors.muted }}>{label}</Text>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: colors.line, height: 62, paddingBottom: 8 },
        tabBarActiveTintColor: colors.primary,
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ tabBarIcon: ({ focused }) => <Icon label="●" focused={focused} /> }} />
      <Tab.Screen name="Customers" component={CustomersScreen} options={{ tabBarIcon: ({ focused }) => <Icon label="●" focused={focused} /> }} />
      <Tab.Screen name="Loans" component={LoansScreen} options={{ tabBarIcon: ({ focused }) => <Icon label="●" focused={focused} /> }} />
      <Tab.Screen name="Recovery" component={RecoveryScreen} options={{ tabBarIcon: ({ focused }) => <Icon label="●" focused={focused} /> }} />
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ tabBarIcon: ({ focused }) => <Icon label="●" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.primary },
};

export default function RootNav() {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Main" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="CustomerForm" component={CustomerFormScreen} options={{ title: 'Customer' }} />
        <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Customer' }} />
        <Stack.Screen name="LoanForm" component={LoanFormScreen} options={{ title: 'New loan' }} />
        <Stack.Screen name="LoanDetail" component={LoanDetailScreen} options={{ title: 'Loan' }} />
        <Stack.Screen name="Installment" component={InstallmentScreen} options={{ title: 'Installment' }} />
        <Stack.Screen name="PaymentForm" component={PaymentFormScreen} options={{ title: 'Payment' }} />
        <Stack.Screen name="Settlement" component={SettlementScreen} options={{ title: 'Settlement' }} />
        <Stack.Screen name="Receipt" component={ReceiptScreen} options={{ title: 'Receipt' }} />
        <Stack.Screen name="Statement" component={StatementScreen} options={{ title: 'Statement' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
