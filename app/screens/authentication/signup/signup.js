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
import { FcGoogle } from 'react-icons/fc';

const Signup = ({ navigation }) => {
  const [isPasswordShown, setPasswordShown] = useState(false);
  const [isChecked, setIschecked] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <View style={{ flex: 1, marginHorizontal: 22 }}>
        <View style={{ marginVertical: 22 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: 'bold',
              marginVertical: 12,
              color: COLORS.black,
            }}
          >
            Create Account
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.black }}>
            Buy,market and sell your products today!
          </Text>
        </View>
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: 400, marginVertical: 8 }}>
            Email address
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
              style={{ width: '100%' }}
              placeholder="Enter your email address"
              placeholderTextColor={COLORS.black}
              keyboardType="email-address"
            />
          </View>
        </View>
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: 400, marginVertical: 8 }}>
            Mobile number
          </Text>
          <View
            style={{
              width: '100%',
              height: 48,
              borderColor: COLORS.black,
              borderWidth: 1,
              borderRadius: 8,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingLeft: 22,
            }}
          >
            <TextInput
              style={{
                width: '12%',
                borderRightWidth: 1,
                borderLeftColor: COLORS.grey,
                height: '100%',
              }}
              placeholder="+26"
              placeholderTextColor={COLORS.black}
              keyboardType="numeric"
            />
            <TextInput
              style={{
                width: '86%',
              }}
              placeholder="Enter your phone number"
              placeholderTextColor={COLORS.black}
              keyboardType="numeric"
            />
          </View>
        </View>
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: 400, marginVertical: 8 }}>
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
              style={{ width: '100%' }}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.black}
              secureTextEntry={isPasswordShown}
            />
            <TouchableOpacity
              onPress={() => setPasswordShown(!isPasswordShown)}
              style={{ position: 'absolute', right: 12 }}
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
            marginRight: 6,
            marginTop: 6,
            flexDirection: 'row',
          }}
        >
          <Checkbox
            style={{ marginRight: 8 }}
            value={isChecked}
            onValueChange={setIschecked}
            color={isChecked ? COLORS.darkBlue : undefined}
          />
          <Text>I agree to the terms and conditions</Text>
        </View>
        <Button
          title="Sign Up"
          filled
          style={{ marginTop: 18, marginBottom: 4 }}
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
          <Text style={{ fontSize: 14 }}>Or Sign up with</Text>
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: COLORS.grey,
              marginHorizontal: 10,
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
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
            <Text>Google</Text>
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
            <Text>Facebook</Text>
          </TouchableOpacity>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            marginVertical: 22,
          }}
        >
          <Text style={{ fontSize: 16, color: COLORS.black }}>
            Already have an account?
          </Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text
              style={{
                fontSize: 16,
                color: COLORS.darkBlue,
                fontWeight: 'bold',
                marginLeft: 6,
              }}
            >
              Login
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Signup;
