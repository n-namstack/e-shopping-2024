import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';

/**
 * Button component with support for different variants
 * 
 * @param {Object} props
 * @param {string} props.title - Button text
 * @param {function} props.onPress - Function to call when button is pressed
 * @param {string} props.variant - Button style variant ('primary', 'outline', 'text', 'danger')
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {boolean} props.isLoading - Shows a loading indicator when true
 * @param {boolean} props.isFullWidth - Make button take full width of container
 * @param {Object} props.style - Additional styles for the button container
 * @param {Object} props.textStyle - Additional styles for the button text
 * @param {Function} props.icon - Icon component to display before the title
 */
const Button = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  isLoading = false,
  isFullWidth = false,
  style,
  textStyle,
  icon,
  size = 'medium',
}) => {
  // Determine container style based on variant
  const getContainerStyle = () => {
    if (disabled) {
      return styles.buttonDisabled;
    }
    
    switch (variant) {
      case 'primary':
        return styles.buttonPrimary;
      case 'outline':
        return styles.buttonOutline;
      case 'text':
        return styles.buttonText;
      case 'danger':
        return styles.buttonDanger;
      default:
        return styles.buttonPrimary;
    }
  };
  
  // Determine text style based on variant
  const getTextStyle = () => {
    if (disabled) {
      return styles.textDisabled;
    }
    
    switch (variant) {
      case 'primary':
        return styles.textPrimary;
      case 'outline':
        return styles.textOutline;
      case 'text':
        return styles.textText;
      case 'danger':
        return styles.textDanger;
      default:
        return styles.textPrimary;
    }
  };

  // Determine size style
  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.buttonSmall;
      case 'large':
        return styles.buttonLarge;
      default:
        return styles.buttonMedium;
    }
  };
  
  const handlePress = () => {
    if (!disabled && !isLoading && onPress) {
      onPress();
    }
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        getContainerStyle(),
        getSizeStyle(),
        isFullWidth && styles.fullWidth,
        Platform.OS === 'ios' && styles.iosButton,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      {isLoading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' || variant === 'danger' ? COLORS.white : COLORS.primary} 
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon()}</View>}
          <Text style={[styles.text, getTextStyle(), textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: SIZES.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.spacing.md,
    ...SHADOWS.medium,
  },
  iosButton: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: SIZES.spacing.sm,
  },
  text: {
    fontSize: SIZES.body1,
    fontFamily: FONTS.semiBold,
  },
  fullWidth: {
    width: '100%',
  },
  // Size variants
  buttonSmall: {
    height: 40,
    paddingHorizontal: SIZES.spacing.sm,
  },
  buttonMedium: {
    height: 48,
    paddingHorizontal: SIZES.spacing.md,
  },
  buttonLarge: {
    height: 56,
    paddingHorizontal: SIZES.spacing.lg,
  },
  // Primary variant
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  textPrimary: {
    color: COLORS.white,
  },
  // Outline variant
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  textOutline: {
    color: COLORS.primary,
  },
  // Text variant
  buttonText: {
    backgroundColor: 'transparent',
    height: 40,
    ...SHADOWS.none,
  },
  textText: {
    color: COLORS.primary,
  },
  // Danger variant
  buttonDanger: {
    backgroundColor: COLORS.error,
  },
  textDanger: {
    color: COLORS.white,
  },
  // Disabled state
  buttonDisabled: {
    backgroundColor: COLORS.surfaceMedium,
    ...SHADOWS.small,
  },
  textDisabled: {
    color: COLORS.textLight,
  },
});

export default Button; 