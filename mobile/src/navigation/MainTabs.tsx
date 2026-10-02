import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet, Platform, Image } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { NotificationContext, NotificationProvider } from '../context/NotificationContext';
import { COLORS } from '../theme/theme';
import { getImageUrl } from '../utils/config';
import { NotificationBell } from '../components/NotificationBell';

import { MenuHomeScreen } from '../screens/MenuHomeScreen';
import { MenuItemDetailScreen } from '../screens/MenuItemDetailScreen';
import { CreateOrderScreen } from '../screens/CreateOrderScreen';
import { MyOrdersScreen } from '../screens/MyOrdersScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AdminManageMenuScreen } from '../screens/AdminManageMenuScreen';
import { AdminAddEditItemScreen } from '../screens/AdminAddEditItemScreen';
import { AdminOrdersScreen } from '../screens/AdminOrdersScreen';
import { AdminAnalyticsScreen } from '../screens/AdminAnalyticsScreen';
import { AdminUsersScreen } from '../screens/AdminUsersScreen';
import { NotificationCenterScreen } from '../screens/NotificationCenterScreen';

import { PaymentSuccessScreen } from '../screens/PaymentSuccessScreen';
import { ReceiptScreen } from '../screens/ReceiptScreen';
import { ChefQRScannerScreen } from '../screens/ChefQRScannerScreen';

const Tab = createBottomTabNavigator();
const MenuStack = createNativeStackNavigator();
const AdminMenuStack = createNativeStackNavigator();
const NotifStack = createNativeStackNavigator();

// ── Notification Center stack (shared across all roles) ──────────────────────
const NotificationStackNavigator = () => (
  <NotifStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { fontWeight: '800', fontSize: 17 }
    }}
  >
    <NotifStack.Screen
      name="NotificationCenter"
      component={NotificationCenterScreen}
      options={{ title: '🔔 Notifications' }}
    />
  </NotifStack.Navigator>
);

// ── Nested Student Menu Stack ─────────────────────────────────────────────────
const MenuStackNavigator = () => (
  <MenuStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { fontWeight: '800', fontSize: 17 },
      headerShadowVisible: true
    }}
  >
    <MenuStack.Screen
      name="MenuHome"
      component={MenuHomeScreen}
      options={{ title: '🍱 SLIIT Campus Canteen' }}
    />
    <MenuStack.Screen
      name="MenuItemDetail"
      component={MenuItemDetailScreen}
      options={{ title: '🍛 Item Details' }}
    />
    <MenuStack.Screen
      name="CreateOrder"
      component={CreateOrderScreen}
      options={{ title: '🛒 Pre-order Checkout' }}
    />
    <MenuStack.Screen
      name="PaymentSuccess"
      component={PaymentSuccessScreen}
      options={{ title: '🎉 Payment Confirmation' }}
    />
    <MenuStack.Screen
      name="Receipt"
      component={ReceiptScreen}
      options={{ title: '🧾 Digital Receipt' }}
    />
  </MenuStack.Navigator>
);

// ── Nested Admin/Chef Menu Stack ──────────────────────────────────────────────
const AdminMenuStackNavigator = () => (
  <AdminMenuStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { fontWeight: '800', fontSize: 17 }
    }}
  >
    <AdminMenuStack.Screen
      name="AdminManageMenuHome"
      component={AdminManageMenuScreen}
      options={{ title: '⚙️ Manage Canteen Menu' }}
    />
    <AdminMenuStack.Screen
      name="AdminAddEditItem"
      component={AdminAddEditItemScreen}
      options={({ route }: any) => ({
        title: route.params?.item ? '✏️ Edit Food Item' : '➕ Add Food Item'
      })}
    />
  </AdminMenuStack.Navigator>
);

// ── Inner tabs (wrapped by NotificationProvider) ──────────────────────────────
const InnerTabs = () => {
  const { user } = useContext(AuthContext);
  const { unreadCount } = useContext(NotificationContext);

  const isAdminRole = user?.role === 'admin';
  const isChefRole = user?.role === 'chef' || (user?.isAdmin && !isAdminRole);

  const badgeText = isAdminRole ? '🛡️ ADMIN' : isChefRole ? '🍳 CHEF' : '🎓 STUDENT';

  const renderRoleBadge = () => (
    <View style={styles.headerBadge}>
      <Text style={styles.headerBadgeText}>{badgeText}</Text>
    </View>
  );

  const profileAvatarUrl = user?.profilePicture ? getImageUrl(user.profilePicture) : null;

  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => ({
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: Platform.OS === 'ios' ? 84 : 65,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#1F2937',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 6
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginTop: 2
        },
        headerStyle: {
          backgroundColor: COLORS.primary,
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
          letterSpacing: 0.3
        },
        headerRight: () => (
          <View style={styles.headerRight}>
            <NotificationBell onPress={() => navigation.navigate('NotificationsTab')} />
            {renderRoleBadge()}
          </View>
        )
      })}
    >
      {/* 1. SYSTEM ADMIN ROLE TABS */}
      {isAdminRole ? (
        <>
          <Tab.Screen
            name="AdminAnalyticsTab"
            component={AdminAnalyticsScreen}
            options={{
              title: 'Analytics',
              headerTitle: '📊 Sales & Slot Analytics',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                  <Text style={{ fontSize: focused ? 20 : 18 }}>📊</Text>
                </View>
              )
            }}
          />

          <Tab.Screen
            name="AdminUsersTab"
            component={AdminUsersScreen}
            options={{
              title: 'Users & Staff',
              headerTitle: '👥 Manage Users & Verification',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                  <Text style={{ fontSize: focused ? 20 : 18 }}>👥</Text>
                </View>
              )
            }}
          />
        </>
      ) : null}

      {/* 2. CHEF / KITCHEN STAFF ROLE TABS */}
      {isChefRole ? (
        <>
          <Tab.Screen
            name="KitchenOrdersTab"
            component={AdminOrdersScreen}
            options={{
              title: 'Orders',
              headerTitle: '🍳 Live Kitchen Orders',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                  <Text style={{ fontSize: focused ? 22 : 19 }}>🍳</Text>
                </View>
              )
            }}
          />

          <Tab.Screen
            name="ChefQRScannerTab"
            component={ChefQRScannerScreen}
            options={{
              title: 'Scan Pickup',
              headerTitle: '📷 Scan Pickup QR',
              tabBarIcon: ({ focused }) => (
                <View style={[
                  styles.iconContainer,
                  focused && styles.iconContainerActive,
                  focused && styles.iconContainerQR
                ]}>
                  <Text style={{ fontSize: focused ? 22 : 19 }}>📷</Text>
                </View>
              )
            }}
          />

          <Tab.Screen
            name="AdminMenuTab"
            component={AdminMenuStackNavigator}
            options={{
              headerShown: false,
              title: 'Menu',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                  <Text style={{ fontSize: focused ? 22 : 19 }}>🍽️</Text>
                </View>
              )
            }}
          />
        </>
      ) : null}

      {/* 3. STUDENT ROLE TABS */}
      {!isAdminRole && !isChefRole ? (
        <>
          <Tab.Screen
            name="MenuTab"
            component={MenuStackNavigator}
            options={{
              headerShown: false,
              title: 'Food Menu',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                  <Text style={{ fontSize: focused ? 20 : 18 }}>🍱</Text>
                </View>
              )
            }}
          />

          <Tab.Screen
            name="MyOrdersTab"
            component={MyOrdersScreen}
            options={{
              title: 'My Orders',
              headerTitle: '📋 My Pre-orders',
              tabBarIcon: ({ focused }) => (
                <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                  <Text style={{ fontSize: focused ? 20 : 18 }}>📋</Text>
                </View>
              )
            }}
          />
        </>
      ) : null}

      {/* Shared Profile Tab */}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'My Profile',
          headerTitle: '👤 User Profile',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              {profileAvatarUrl ? (
                <Image
                  source={{ uri: profileAvatarUrl }}
                  style={[styles.tabAvatarImage, focused && styles.tabAvatarImageActive]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.tabAvatarCircle, focused && styles.tabAvatarCircleActive]}>
                  <Text style={styles.tabAvatarText}>
                    {(user?.name || user?.username || 'P').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )
        }}
      />

      {/* Shared Notifications Tab (hidden from tab bar — accessible via bell icon) */}
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationStackNavigator}
        options={{
          headerShown: false,
          tabBarButton: () => null,  // Hidden from tab bar
          title: 'Notifications'
        }}
      />
    </Tab.Navigator>
  );
};

// ── Exported component — wraps InnerTabs with NotificationProvider ────────────
export const MainTabs = () => {
  return (
    <NotificationProvider>
      <InnerTabs />
    </NotificationProvider>
  );
};

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 4
  },
  headerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFF4EB'
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 0.5
  },
  iconContainer: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconContainerActive: {
    backgroundColor: COLORS.primaryLight
  },
  iconContainerQR: {
    backgroundColor: '#FFF4EB'
  },
  tabAvatarImage: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: COLORS.textSecondary
  },
  tabAvatarImageActive: {
    borderColor: COLORS.primary,
    borderWidth: 2
  },
  tabAvatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.textSecondary
  },
  tabAvatarCircleActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.primary,
    borderWidth: 2
  },
  tabAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  }
});

