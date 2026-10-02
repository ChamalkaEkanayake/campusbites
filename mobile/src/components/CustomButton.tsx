import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { COLORS } from '../theme/theme';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'secondary' | 'danger' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'accent':
        return styles.accentBtn;
      case 'secondary':
        return styles.secondaryBtn;
      case 'danger':
        return styles.dangerBtn;
      case 'outline':
        return styles.outlineBtn;
      default:
        return styles.primaryBtn;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.outlineBtnText;
      case 'secondary':
        return styles.secondaryBtnText;
      default:
        return styles.primaryBtnText;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        disabled || loading ? styles.disabledBtn : null,
        style
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'secondary' ? COLORS.primary : '#FFFFFF'} />
      ) : (
        <Text style={[styles.text, getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  primaryBtn: {
    backgroundColor: COLORS.primary
  },
  accentBtn: {
    backgroundColor: COLORS.accent
  },
  secondaryBtn: {
    backgroundColor: COLORS.primaryLight
  },
  dangerBtn: {
    backgroundColor: COLORS.error
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary
  },
  disabledBtn: {
    opacity: 0.6
  },
  text: {
    fontSize: 15,
    fontWeight: '700'
  },
  primaryBtnText: {
    color: '#FFFFFF'
  },
  secondaryBtnText: {
    color: COLORS.primary
  },
  outlineBtnText: {
    color: COLORS.primary
  }
});
