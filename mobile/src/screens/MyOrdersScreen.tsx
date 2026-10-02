import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert
} from 'react-native';
import { orderApi, Order } from '../api/orderApi';
import { OrderCard } from '../components/OrderCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CustomButton } from '../components/CustomButton';
import { COLORS } from '../theme/theme';

export const MyOrdersScreen = ({ navigation }: any) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchOrders = async () => {
    try {
      setErrorMsg('');
      const data = await orderApi.getMyOrders();
      setOrders(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load order history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const unsubscribe = navigation.addListener('focus', fetchOrders);
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  const handleCancelOrder = (orderId: string) => {
    Alert.alert(
      'Cancel Pre-order?',
      'Are you sure you want to cancel this pre-order? Your daily stock quota will be released.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel Order',
          style: 'destructive',
          onPress: async () => {
            try {
              await orderApi.cancelOrder(orderId);
              Alert.alert('Order Cancelled', 'Your pre-order has been cancelled successfully.');
              fetchOrders();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not cancel order');
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return <LoadingSpinner message="Fetching your canteen pre-orders..." />;
  }

  return (
    <View style={styles.container}>
      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View>
            <OrderCard
              order={item}
              onCancel={() => handleCancelOrder(item._id)}
            />
            {/* Receipt & QR buttons below each non-cancelled order */}
            {item.status !== 'Cancelled' ? (
              <View style={styles.receiptActions}>
                <CustomButton
                  title="🧾 View Receipt & QR"
                  variant="primary"
                  onPress={() => navigation.navigate('MenuTab', {
                    screen: 'Receipt',
                    params: { orderId: item._id }
                  })}
                  style={styles.receiptBtn}
                  textStyle={{ fontSize: 12 }}
                />
              </View>
            ) : null}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptySub}>
              You haven't placed any canteen pre-orders yet. Browse the menu tab to place your first lecture break meal order!
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
  listContent: {
    padding: 16
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    margin: 16,
    borderRadius: 8
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    fontSize: 13
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
    textAlign: 'center',
    lineHeight: 20
  },
  receiptActions: {
    marginHorizontal: 0,
    marginTop: -6,
    marginBottom: 14,
    paddingHorizontal: 0
  },
  receiptBtn: {
    paddingVertical: 9,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0
  }
});
