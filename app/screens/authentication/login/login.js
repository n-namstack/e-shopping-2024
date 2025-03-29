import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Pressable,
} from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import COLORS from '../../../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import Checkbox from 'expo-checkbox';
import Button from '../../../components/button';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

const Login = ({ navigation }) => {
  const [isPasswordShown, setIsPasswordShown] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_700Bold });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <View style={{ marginHorizontal: 22 }}>
        <View style={{ marginVertical: 22 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: 'bold',
              marginVertical: 12,
              color: COLORS.black,
              fontFamily: 'Poppins_700Bold',
            }}
          >
            Hi Welcome Back! 👋
          </Text>
        </View>
        <View style={{ marginBottom: 22 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: 400,
              marginHorizontal: 8,
              marginVertical: 8,
              fontFamily: 'Poppins_400Regular',
            }}
          >
            Email address
          </Text>
          <View
            style={{
              width: '100%',
              height: 48,
              borderColor: COLORS.black,
              borderWidth: 1,
              borderRadius: 8,
              alignContent: 'center',
              justifyContent: 'center',
              paddingLeft: 22,
            }}
          >
            <TextInput
              placeholder="Enter email address"
              placeholderTextColor={COLORS.black}
              keyboardType="email-address"
              style={{ width: '100%', fontFamily: 'Poppins_400Regular' }}
            />
          </View>
        </View>
        <View style={{ marginBottom: 12 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: 400,
              marginVertical: 8,
              fontFamily: 'Poppins_400Regular',
            }}
          >
            Password
          </Text>

          <View
            style={{
              width: '100%',
              height: 48,
              borderColor: COLORS.black,
              borderWidth: 1,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: 22,
            }}
          >
            <TextInput
              placeholder="Enter your password"
              placeholderTextColor={COLORS.black}
              secureTextEntry={isPasswordShown}
              style={{
                width: '100%',
                fontFamily: 'Poppins_400Regular',
              }}
            />

            <TouchableOpacity
              onPress={() => setIsPasswordShown(!isPasswordShown)}
              style={{
                position: 'absolute',
                right: 12,
              }}
            >
              {isPasswordShown == true ? (
                <Ionicons name="eye-off" size={24} color={COLORS.black} />
              ) : (
                <Ionicons name="eye" size={24} color={COLORS.black} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            marginVertical: 6,
          }}
        >
          <Checkbox
            style={{ marginRight: 8 }}
            value={isChecked}
            onValueChange={setIsChecked}
            color={isChecked ? COLORS.darkBlue : undefined}
          />

          <Text style={{ fontFamily: 'Poppins_400Regular' }}>Remember Me</Text>
        </View>

        <Button
          title="Login"
          filled
          style={{
            marginTop: 18,
            marginBottom: 4,
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginVertical: 20,
          }}
        >
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: COLORS.grey,
              marginHorizontal: 10,
            }}
          />
          <Text style={{ fontSize: 14, fontFamily: 'Poppins_400Regular' }}>
            Or Login with
          </Text>
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: COLORS.grey,
              marginHorizontal: 10,
            }}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          <TouchableOpacity
            onPress={() => console.log('Pressed')}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              height: 52,
              borderWidth: 1,
              borderColor: COLORS.grey,
              marginRight: 4,
              borderRadius: 10,
            }}
          >
            <Image
              source={require('../../../../assets/social-media-logos/google-logo.png')}
              style={{
                height: 36,
                width: 36,
                marginRight: 8,
              }}
              resizeMode="contain"
            />

            <Text style={{ fontFamily: 'Poppins_400Regular' }}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => console.log('Pressed')}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              height: 52,
              borderWidth: 1,
              borderColor: COLORS.grey,
              marginRight: 4,
              borderRadius: 10,
            }}
          >
            <Image
              source={require('../../../../assets/social-media-logos/Facebook-logo.png')}
              style={{
                height: 36,
                width: 36,
                marginRight: 8,
              }}
              resizeMode="contain"
            />

            <Text style={{ fontFamily: 'Poppins_400Regular' }}>Facebook</Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            marginVertical: 22,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: COLORS.black,
              fontFamily: 'Poppins_400Regular',
            }}
          >
            Don't have an account ?{' '}
          </Text>
          <Pressable onPress={() => navigation.navigate('Signup')}>
            <Text
              style={{
                fontSize: 16,
                color: COLORS.darkBlue,
                fontWeight: 'bold',
                marginLeft: 6,
                fontFamily: 'Poppins_400Regular',
              }}
            >
              Register
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Login;
