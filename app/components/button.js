import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import React from 'react';
import COLORS from '../../constants/colors';
import { useFonts, Poppins_600SemiBold } from '@expo-google-fonts/poppins';

const Button = (props) => {
  const filledBgColor = props.color || COLORS.darkBlue;
  const outlinedColor = COLORS.white;
  const bgColor = props.filled ? filledBgColor : outlinedColor;
  const textColor = props.filled ? COLORS.white : COLORS.darkBlue;
  const [fontsLoaded] = useFonts({ Poppins_600SemiBold });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <TouchableOpacity
      style={{
        ...styles.button,
        ...{ backgroundColor: bgColor },
        ...props.style,
      }}
      onPress={props.onPress}
    >
      <Text
        style={{
          fontSize: 16,
          fontFamily: 'Poppins_600SemiBold',
          fontWeight: '600',
          ...{ color: textColor },
        }}
      >
        {props.title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 16,
    paddingVerticle: 10,
    borderColor: COLORS.darkBlue,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Button;
