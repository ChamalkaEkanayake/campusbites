import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { orderApi, Order } from '../api/orderApi';
import { menuApi, MenuItem } from '../api/menuApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../theme/theme';

const MAX_SLOT_CAPACITY = 25;
// These must exactly match the breakTimeSlot enum values in the Order model
const SLOTS = [
  'Morning Break (10:30 AM - 10:45 AM)',
  'Lunch Break (12:30 PM - 01:15 PM)',
  'Evening Break (03:30 PM - 03:45 PM)'
];

// Display-friendly short labels for the UI
const SLOT_LABELS: Record<string, string> = {
  'Morning Break (10:30 AM - 10:45 AM)': 'Morning 10:30 AM',
  'Lunch Break (12:30 PM - 01:15 PM)': 'Lunch 12:30 PM',
  'Evening Break (03:30 PM - 03:45 PM)': 'Evening 03:30 PM'
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { greeting: 'Good Morning', icon: '☀️' };
  } else if (hour >= 12 && hour < 17) {
    return { greeting: 'Good Afternoon', icon: '🌤️' };
  } else {
    return { greeting: 'Good Evening', icon: '🌙' };
  }
};

export const AdminAnalyticsScreen = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { greeting, icon } = getGreeting();
  const rawAdminName = user?.name || user?.username || 'Admin';
  const firstName = rawAdminName.trim().split(' ')[0];

  const fetchAnalyticsData = async () => {
    try {
      const [fetchedOrders, fetchedMenuItems] = await Promise.all([
        orderApi.getAllOrders(),
        menuApi.getMenuItems()
      ]);
      setOrders(fetchedOrders);
      setMenuItems(fetchedMenuItems);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalyticsData();
  }, []);

  if (loading && !refreshing) {
    return <LoadingSpinner message="Calculating Canteen Real-Time Analytics..." />;
  }

  // Analytics Calculations
  const nonCancelledOrders = orders.filter((o) => o.status !== 'Cancelled');
  const validPaidOrPendingOrders = nonCancelledOrders.filter((o) => o.paymentStatus !== 'FAILED');
  const totalRevenue = validPaidOrPendingOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const onlineRevenue = validPaidOrPendingOrders
    .filter((o) => o.paymentMethod === 'ONLINE')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const cashRevenue = validPaidOrPendingOrders
    .filter((o) => o.paymentMethod === 'CASH_ON_PICKUP')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const totalOrdersCount = orders.length;
  const completedOrdersCount = orders.filter((o) => o.status === 'Completed').length;
  const activeOrdersCount = orders.filter((o) =>
    ['Pending', 'Preparing', 'Ready'].includes(o.status)
  ).length;

  // Slot utilization count
  const slotStats = SLOTS.map((slot) => {
    const slotActiveCount = orders.filter(
      (o) => o.breakTimeSlot === slot && ['Pending', 'Preparing'].includes(o.status)
    ).length;
    const percentage = Math.min(Math.round((slotActiveCount / MAX_SLOT_CAPACITY) * 100), 100);
    return {
      slot,
      activeCount: slotActiveCount,
      percentage
    };
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
      }
    >
      {/* Header Badge & Greeting */}
      <View style={styles.header}>
        <Text style={styles.badgeText}>📊 System Executive Dashboard</Text>
        <Text style={styles.title}>
          {icon} {greeting}, <Text style={styles.titleName}>{firstName}</Text>!
        </Text>
        <Text style={styles.subtitle}>
          Real-time metrics, payment stats, and break slot capacity utilization.
        </Text>
      </View>

      {/* KPI Cards Grid */}
      <View style={styles.statsGrid}>
        {/* Total Revenue Card - Accent Orange */}
        <View style={[styles.kpiCard, styles.kpiCardOrange]}>
          <Text style={styles.kpiIcon}>💰</Text>
          <Text style={styles.kpiLabel}>Total Revenue</Text>
          <Text style={styles.kpiValue}>Rs. {totalRevenue.toFixed(2)}</Text>
          <Text style={styles.kpiSub}>From {validPaidOrPendingOrders.length} valid orders</Text>
        </View>

        {/* Total Orders Card - SLIIT Primary Blue */}
        <View style={[styles.kpiCard, styles.kpiCardBlue]}>
          <Text style={styles.kpiIcon}>📦</Text>
          <Text style={styles.kpiLabel}>Total Orders</Text>
          <Text style={styles.kpiValue}>{totalOrdersCount}</Text>
          <Text style={styles.kpiSub}>{completedOrdersCount} completed</Text>
        </View>

        {/* Active Kitchen Orders */}
        <View style={[styles.kpiCard, styles.kpiCardOrange]}>
          <Text style={styles.kpiIcon}>🔥</Text>
          <Text style={styles.kpiLabel}>Active Orders</Text>
          <Text style={styles.kpiValue}>{activeOrdersCount}</Text>
          <Text style={styles.kpiSub}>In prep & ready queue</Text>
        </View>

        {/* Total Food Items */}
        <View style={[styles.kpiCard, styles.kpiCardGreen]}>
          <Text style={styles.kpiIcon}>🍱</Text>
          <Text style={styles.kpiLabel}>Active Menu Items</Text>
          <Text style={styles.kpiValue}>{menuItems.length}</Text>
          <Text style={styles.kpiSub}>
            {menuItems.filter((i) => i.isAvailable).length} available today
          </Text>
        </View>
      </View>

      {/* Payment Revenue Breakdown Card */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💳 Payment Method Revenue Breakdown</Text>
          <Text style={styles.sectionSub}>Stripe online payments vs Cash on pickup totals</Text>
        </View>

        <View style={styles.paymentBreakdownGrid}>
          <View style={styles.paymentBox}>
            <Text style={styles.paymentBoxIcon}>💳</Text>
            <Text style={styles.paymentBoxLabel}>Stripe Online</Text>
            <Text style={styles.paymentBoxVal}>Rs. {onlineRevenue.toFixed(2)}</Text>
            <Text style={styles.paymentBoxSub}>
              {orders.filter((o) => o.paymentMethod === 'ONLINE' && o.paymentStatus === 'PAID').length} paid online
            </Text>
          </View>

          <View style={styles.paymentBox}>
            <Text style={styles.paymentBoxIcon}>💵</Text>
            <Text style={styles.paymentBoxLabel}>Cash on Pickup</Text>
            <Text style={styles.paymentBoxVal}>Rs. {cashRevenue.toFixed(2)}</Text>
            <Text style={styles.paymentBoxSub}>
              {orders.filter((o) => o.paymentMethod === 'CASH_ON_PICKUP' && o.paymentStatus === 'PAID').length} cash collected
            </Text>
          </View>
        </View>
      </View>

      {/* Kitchen Break Slot Capacity Utilization */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⚡ Lecture Break Capacity Utilization</Text>
          <Text style={styles.sectionSub}>Capacity limit: 25 active orders per slot</Text>
        </View>

        {slotStats.map((item) => (
          <View key={item.slot} style={styles.slotRow}>
            <View style={styles.slotLabelRow}>
              <Text style={styles.slotName}>{SLOT_LABELS[item.slot] ?? item.slot}</Text>
              <Text style={styles.slotCount}>
                {item.activeCount} / {MAX_SLOT_CAPACITY} orders ({item.percentage}%)
              </Text>
            </View>

            {/* Capacity Progress Bar */}
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${item.percentage}%`,
                    backgroundColor:
                      item.percentage > 80
                        ? COLORS.error
                        : item.percentage > 50
                        ? COLORS.accent
                        : COLORS.primary
                  }
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  content: {
    padding: 18
  },
  header: {
    marginBottom: 20,
    alignItems: 'flex-start'
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 8
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4
  },
  titleName: {
    color: COLORS.accent
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20
  },
  kpiCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3
  },
  kpiCardBlue: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary
  },
  kpiCardOrange: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent
  },
  kpiCardGreen: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success
  },
  kpiIcon: {
    fontSize: 24,
    marginBottom: 6
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginVertical: 4
  },
  kpiSub: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    elevation: 2
  },
  sectionHeader: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  paymentBreakdownGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4
  },
  paymentBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  paymentBoxIcon: {
    fontSize: 22,
    marginBottom: 4
  },
  paymentBoxLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  paymentBoxVal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginVertical: 4
  },
  paymentBoxSub: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  slotRow: {
    marginBottom: 14
  },
  slotLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  slotName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text
  },
  slotCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  progressBarBg: {
    height: 10,
    backgroundColor: COLORS.background,
    borderRadius: 5,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5
  }
});
