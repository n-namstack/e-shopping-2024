import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';
import WelcomeScreen from '../screens/Auth/WelcomeScreen';
import SocialProfileCompleteScreen from '../screens/authentication/SocialProfileCompleteScreen';
import { useAppTheme } from '../constants/themeContext';

const Stack = createStackNavigator();

const AuthNavigator = () => {
  const { isDarkMode } = useAppTheme();

  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: isDarkMode ? '#0D0D14' : '#FFFFFF' },
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: {
            opacity: progress,
          },
        }),
      }}
    >
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreen}
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
        options={{
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="SocialProfileComplete" 
        component={SocialProfileCompleteScreen}
        options={{
          gestureEnabled: false, // Prevent users from going back without completing
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator; 