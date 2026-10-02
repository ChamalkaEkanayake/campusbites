import React, { useContext } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated
} from 'react-native';
import { NotificationContext } from '../context/NotificationContext';
import { COLORS } from '../theme/theme';

interface NotificationBellProps {
  onPress: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onPress }) => {
  const { unreadCount } = useContext(NotificationContext);

  return (
    <TouchableOpacity
      style={styles.bellButton}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      accessibilityRole="button"
    >
      {/* Bell icon */}
      <Text style={styles.bellIcon}>🔔</Text>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bellButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    position: 'relative'
  },
  bellIcon: {
    fontSize: 22
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.primary  // Matches header background
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12
  }
});
