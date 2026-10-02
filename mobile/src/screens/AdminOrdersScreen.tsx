import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { orderApi, Order } from '../api/orderApi';
import { OrderCard } from '../components/OrderCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../theme/theme';

const STATUS_FILTERS = ['All', 'Pending', 'Preparing', 'Ready', 'Completed'];

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

export const AdminOrdersScreen = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All');

  const { greeting, icon } = getGreeting();
  const chefName = user?.name || user?.username || 'Chef';

  const fetchOrders = async () => {
    try {
      const filter = selectedStatus === 'All' ? undefined : selectedStatus;
      const data = await orderApi.getAllOrders(filter);
      setOrders(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch canteen orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const unsubscribe = navigation.addListener('focus', fetchOrders);
    return unsubscribe;
  }, [selectedStatus, navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [selectedStatus]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await orderApi.updateOrderStatus(orderId, newStatus);
      Alert.alert('Status Updated', `Order status updated to "${newStatus}".`);
      fetchOrders();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update order status');
    }
  };

  const handleConfirmCashPayment = async (orderId: string) => {
    try {
      await orderApi.confirmCashPayment(orderId);
      Alert.alert('Cash Payment Confirmed', 'Payment status updated to PAID for this cash order.');
      fetchOrders();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not confirm cash payment');
    }
  };

  if (loading && !refreshing) {
    return <LoadingSpinner message="Fetching canteen kitchen orders..." />;
  }

  return (
    <View style={styles.container}>
      {/* Time-based Greeting Header */}
      <View style={styles.greetingHeader}>
        <Text style={styles.greetingTitle}>
          {icon} {greeting}, <Text style={styles.greetingName}>{chefName}</Text>!
        </Text>
        <Text style={styles.greetingSub}>
          Kitchen Orders & Break Slot Food Preparation Queue
        </Text>
      </View>

      {/* Filter Header */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(st) => st}
          renderItem={({ item: st }) => {
            const isSelected = selectedStatus === st;
            return (
              <TouchableOpacity
                style={[styles.filterPill, isSelected ? styles.filterPillActive : null]}
                onPress={() => setSelectedStatus(st)}
              >
                <Text
                  style={[
                    styles.filterText,
                    isSelected ? styles.filterTextActive : null
                  ]}
                >
                  {st}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            isAdmin={true}
            onUpdateStatus={(newStatus) => handleUpdateStatus(item._id, newStatus)}
            onConfirmCashPayment={() => handleConfirmCashPayment(item._id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🍳</Text>
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptySub}>
              {selectedStatus !== 'All'
                ? `No orders matching status "${selectedStatus}".`
                : 'There are currently no active pre-orders in the system.'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  greetingHeader: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text
  },
  greetingName: {
    color: COLORS.accent
  },
  greetingSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  filterRow: {
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    marginRight: 8
  },
  filterPillActive: {
    backgroundColor: COLORS.primary
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  filterTextActive: {
    color: '#FFFFFF'
  },
  listContent: {
    padding: 16
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center'
  }
});
