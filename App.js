import { NavigationContainer, useNavigation } from '@react-navigation/native';
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
  Profile,
} from './app/screens';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_600SemiBold,
  Poppins_500Medium,
  Poppins_500Medium_Italic,
} from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ToastProvider } from 'react-native-toast-notifications';
import { useState } from 'react';
import { TabView, SceneMap } from 'react-native-tab-view';
import COLORS from './constants/colors';

const Stack = createNativeStackNavigator();

// const renderScreen = () => {
//   switch (currentScreen) {
//     case 'Home':
//       return <ShopPublic />;
//     case 'Shops':
//       return <Shop />;
//     case 'Cart':
//       return <Cart />;
//     case 'Profile':
//       return <Home />;
//     case 'ShopInfo':
//       return <ShopInfo />;
//     default:
//       return null;
//   }
// };

const NavBar = ({ currentScreen, setCurrentScreen }) => {
  const navigation = useNavigation();

  return (
    <View>
      {/* <View style={styles.screen}>{renderScreen()}</View> */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => {
            setCurrentScreen('Home');
            navigation.navigate('Home');
          }}
          style={{ alignItems: 'center' }}
        >
          <Ionicons
            name="home"
            size={24}
            style={currentScreen === 'Home' ? styles.activeTab : styles.tab}
          ></Ionicons>
          <Text style={{ fontFamily: 'Poppins_400Regular' }}>Home</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={{ alignItems: 'center' }}
          onPress={() => {
            setCurrentScreen('Shops');
            navigation.navigate('Shops');
          }}
        >
          <Ionicons
            name="book"
            style={currentScreen === 'Shops' ? styles.activeTab : styles.tab}
          ></Ionicons>
          <Text style={{ fontFamily: 'Poppins_400Regular' }}>Shops</Text>
        </TouchableOpacity>
        <View style={styles.divider} />

        <TouchableOpacity
          style={{ alignItems: 'center' }}
          onPress={() => {
            setCurrentScreen('Cart');
            navigation.navigate('Cart');
          }}
        >
          <Ionicons
            name="cart"
            style={currentScreen === 'Cart' ? styles.activeTab : styles.tab}
          ></Ionicons>
          <Text style={{ fontFamily: 'Poppins_400Regular' }}>Cart</Text>
        </TouchableOpacity>
        <View style={styles.divider} />

        <TouchableOpacity
          style={{ alignItems: 'center' }}
          onPress={() => {
            setCurrentScreen('Profile');
            navigation.navigate('Profile');
          }}
        >
          <Ionicons
            name="person"
            size={24}
            style={currentScreen === 'Profile' ? styles.activeTab : styles.tab}
          ></Ionicons>
          <Text style={{ fontFamily: 'Poppins_400Regular' }}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Home');

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Shops" component={Shop} />
        <Stack.Screen name="Cart" component={Cart} />
        <Stack.Screen name="Profile" component={Profile} />
        <Stack.Screen name="ProductInfo" component={ProductInfo} />
        <Stack.Screen name="ShopInfo" component={ShopInfo} />
        <Stack.Screen name="Welcome" component={Welcome} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Signup" component={Signup} />
        <Stack.Screen name="ShopPublic" component={Login} />
      </Stack.Navigator>

      <NavBar
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
      />

      {/* <Stack.Screen
        name="NavBar"
        children={({ navigation }) => (
          <NavBar
            navigation={navigation}
            currentScreen={currentScreen}
            setCurrentScreen={setCurrentScreen}
          />
        )}
      /> */}
    </NavigationContainer>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    flex: 1,
    // justifyContent: 'center',
    // alignItems: 'center',
    // innerWidth:"100%"
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: '100%',
    width: 1,
    backgroundColor: '#ecf0f1',
    marginHorizontal: 10,
  },
  tab: {
    fontSize: 24,
    color: COLORS.darkBlue,
  },
  activeTab: {
    color: COLORS.gold,
    fontWeight: 'bold',
    fontSize: 24,
  },
});

{
  /* <ToastProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Home">
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
      </ToastProvider> */
}
