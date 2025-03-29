import { View, Text, Image, Pressable } from 'react-native';
import React from 'react';
import COLORS from '../../../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import Button from '../../components/button';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

const Welcome = ({ navigation }) => {
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_700Bold });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LinearGradient
      style={{ flex: 1 }}
      colors={[COLORS.darkBlue, COLORS.lightBlue]}
    >
      <View style={{ flex: 1 }}>
        <View>
          <Image
            source={require('../../../assets/shopping.png')}
            style={{
              height: 100,
              width: 100,
              borderRadius: 20,
              borderColor: COLORS.grey,
              borderWidth: 4,
              position: 'absolute',
              top: 10,
              transform: [
                { translateX: 20 },
                { translateY: 50 },
                { rotate: '-15deg' },
              ],
            }}
          />
          <Image
            source={require('../../../assets/shopping2.png')}
            style={{
              height: 100,
              width: 100,
              borderRadius: 20,
              borderColor: COLORS.grey,
              borderWidth: 4,
              position: 'absolute',
              top: -30,
              left: 100,
              transform: [
                { translateX: 50 },
                { translateY: 50 },
                { rotate: '-5deg' },
              ],
            }}
          />

          <Image
            source={require('../../../assets/shopping1.png')}
            style={{
              width: 100,
              height: 100,
              borderRadius: 20,
              borderColor: COLORS.grey,
              borderWidth: 4,
              position: 'absolute',
              top: 130,
              left: -35,
              transform: [
                { translateX: 50 },
                { translateY: 50 },
                { rotate: '15deg' },
              ],
            }}
          />

          <Image
            source={require('../../../assets/shopping3.png')}
            style={{
              width: 200,
              height: 200,
              borderRadius: 20,
              position: 'absolute',
              borderColor: COLORS.grey,
              borderWidth: 4,
              top: 110,
              left: 110,
              transform: [
                { translateX: 50 },
                { translateY: 50 },
                { rotate: '-15deg' },
              ],
            }}
          />
          {/** Content */}
          <View
            style={{
              paddingHorizontal: 22,
              position: 'absolute',
              top: 400,
              width: '100%',
            }}
          >
            <Text
              style={{
                fontSize: 50,
                fontWeight: 800,
                color: COLORS.white,
                fontFamily: 'Poppins_700Bold',
              }}
            >
              Let's Get
            </Text>
            <Text
              style={{
                fontSize: 46,
                fontWeight: 800,
                color: COLORS.white,
                fontFamily: 'Poppins_700Bold',
              }}
            >
              Started
            </Text>
            <View style={{ marginVertical: 22 }}>
              <Text
                style={{
                  fontSize: 16,
                  color: COLORS.white,
                  marginVertical: 4,
                  fontFamily: 'Poppins_400Regular',
                  textAlign: 'justify',
                }}
              >
                Convinient Shopping at your Door Step
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: COLORS.white,
                  fontFamily: 'Poppins_400Regular',
                }}
              >
                Shopping, Selling, Delivery and Advertisement
              </Text>
            </View>
            <Button
              title="Join Now"
              style={{
                marginTop: 22,
                width: '100%',
                fontFamily: 'Poppins_400Regular',
              }}
              onPress={() => navigation.navigate('Signup')}
            />
            <View
              style={{
                flexDirection: 'row',
                marginTop: 12,
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: COLORS.white,
                  fontFamily: 'Poppins_400Regular',
                }}
              >
                Already have an account ?
              </Text>
              <Pressable onPress={() => navigation.navigate('Home')}>
                <Text
                  style={{
                    fontSize: 16,
                    color: COLORS.white,
                    fontWeight: 'bold',
                    marginLeft: 4,
                  }}
                >
                  Login
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

export default Welcome;
