import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Login,
  Signup,
  Welcome,
  Home,
  Cart,
  ProductInfo,
  Shop,
  ShopInfo,
  ShopPublic,
} from './app/screens';
import { ToastProvider } from 'react-native-toast-notifications';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ToastProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="ShopPublic">
          <Stack.Screen
            name="Welcome"
            component={Welcome}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Login"
            component={Login}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Signup"
            component={Signup}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="Home"
            component={Home}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="Cart"
            component={Cart}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="ProductInfo"
            component={ProductInfo}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="Shop"
            component={Shop}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="ShopInfo"
            component={ShopInfo}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="ShopPublic"
            component={ShopPublic}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ToastProvider>
  );
}
