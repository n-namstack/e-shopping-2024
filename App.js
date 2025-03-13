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
  HomeScreen,
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
import FONT_SIZE from './constants/fontSize';
import { MaterialCommunityIcons, Entypo } from '@expo/vector-icons';

const Stack = createNativeStackNavigator();

const NavBar = ({ currentScreen, setCurrentScreen }) => {
  const navigation = useNavigation();

  return (
    <View>
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
          <Text
            style={
              currentScreen === 'Home'
                ? styles.activeNavText
                : styles.navBarText
            }
          >
            Home
          </Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={{ alignItems: 'center' }}
          onPress={() => {
            setCurrentScreen('ShopPublic');
            navigation.navigate('ShopPublic');
          }}
        >
          <Entypo
            name="shop"
            style={currentScreen === 'Shops' ? styles.activeTab : styles.tab}
          ></Entypo>
          <Text
            style={
              currentScreen === 'Shops'
                ? styles.activeNavText
                : styles.navBarText
            }
          >
            Shops
          </Text>
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
          <Text
            style={
              currentScreen === 'Cart'
                ? styles.activeNavText
                : styles.navBarText
            }
          >
            Cart
          </Text>
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
          <Text
            style={
              currentScreen === 'Profile'
                ? styles.activeNavText
                : styles.navBarText
            }
          >
            Profile
          </Text>
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
        <Stack.Screen name="Home" component={HomeScreen} />
        {/* <Stack.Screen name="Home" component={HomeScreen} /> */}
        <Stack.Screen name="Shops" component={Shop} />
        <Stack.Screen name="Cart" component={Cart} />
        <Stack.Screen name="Profile" component={Profile} />
        <Stack.Screen name="ProductInfo" component={ProductInfo} />
        <Stack.Screen name="ShopInfo" component={ShopInfo} />
        <Stack.Screen name="Welcome" component={Welcome} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Signup" component={Signup} />
        <Stack.Screen name="ShopPublic" component={ShopPublic} />
      </Stack.Navigator>
      <NavBar
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
      />
    </NavigationContainer>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    flex: 1,
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
  navBarText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: FONT_SIZE.username,
  },

  activeNavText: {
    color: COLORS.gold,
    fontFamily: 'Poppins_400Regular',
    fontSize: FONT_SIZE.username,
  },

  activeTab: {
    color: COLORS.gold,
    fontWeight: 'bold',
    fontSize: 24,
  },
});
