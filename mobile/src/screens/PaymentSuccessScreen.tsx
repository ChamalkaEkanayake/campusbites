import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { paymentApi, VerifySessionResponse } from '../api/paymentApi';
import { orderApi } from '../api/orderApi';
import { CustomButton } from '../components/CustomButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { COLORS } from '../theme/theme';

export const PaymentSuccessScreen = ({ route, navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [result, setResult] = useState<VerifySessionResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Extract session_id and status from web query string or route params
  let sessionId: string | null = route.params?.sessionId || null;
  let queryStatus: string | null = route.params?.status || null;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (!sessionId) sessionId = urlParams.get('session_id');
    if (!queryStatus) queryStatus = urlParams.get('status');
  }

  useEffect(() => {
    async function verifyStripePayment() {
      if (!sessionId) {
        setVerifying(false);
        setLoading(false);
        setErrorMsg('No payment session reference found.');
        return;
      }

      try {
        setVerifying(true);
        setErrorMsg('');
        const res = await paymentApi.verifySession(sessionId);
        setResult(res);
        // Auto-generate receipt in background after successful payment
        if (res.paymentStatus === 'PAID' && res.order?._id) {
          orderApi.generateReceipt(res.order._id).catch(() => {
            // Silent fail — receipt can be generated from MyOrders too
          });
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to verify payment with Stripe.');
      } finally {
        setVerifying(false);
        setLoading(false);
      }
    }

    verifyStripePayment();
  }, [sessionId]);

  if (loading || verifying) {
    return <LoadingSpinner message="Verifying Stripe payment with backend server..." />;
  }

  const isSuccess = result?.paymentStatus === 'PAID';
  const order = result?.order;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isSuccess ? (
        <View style={styles.card}>
          <View style={styles.iconCircleSuccess}>
            <Text style={styles.iconText}>✅</Text>
          </View>
          <Text style={styles.title}>Payment Successful!</Text>
          <Text style={styles.subtitle}>
            Your Stripe card payment of <Text style={styles.priceHighlight}>LKR {order?.totalAmount?.toFixed(2)}</Text> was verified successfully.
          </Text>

          {/* Receipt Breakdown Box */}
          <View style={styles.receiptBox}>
            <Text style={styles.receiptTitle}>🧾 Order Receipt</Text>

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Order Ref:</Text>
              <Text style={styles.receiptValBold}>#{order?._id?.slice(-6).toUpperCase()}</Text>
            </View>

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Food Item:</Text>
              <Text style={styles.receiptVal}>{order?.menuItem?.name || 'Canteen Item'}</Text>
            </View>

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Break Slot:</Text>
              <Text style={styles.receiptValSlot}>{order?.breakTimeSlot}</Text>
            </View>

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Payment Method:</Text>
              <Text style={styles.receiptVal}>💳 Stripe Test Online Card</Text>
            </View>

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Payment Status:</Text>
              <View style={styles.paidBadge}>
                <Text style={styles.paidBadgeText}>PAID ✅</Text>
              </View>
            </View>

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Total Amount:</Text>
              <Text style={styles.receiptValAmount}>LKR {order?.totalAmount?.toFixed(2)}</Text>
            </View>

            {order?.paidAt ? (
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Paid Date/Time:</Text>
                <Text style={styles.receiptValTime}>{new Date(order.paidAt).toLocaleString()}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.btnRow}>
            <CustomButton
              title="🧾 View Receipt"
              variant="accent"
              onPress={() => {
                if (order?._id) navigation.navigate('Receipt', { orderId: order._id });
              }}
              style={{ flex: 1, marginRight: 6 }}
            />
            <CustomButton
              title="📋 My Orders"
              variant="primary"
              onPress={() => navigation.navigate('MyOrdersTab')}
              style={{ flex: 1, marginLeft: 6 }}
            />
          </View>
          <CustomButton
            title="🍱 Back to Menu"
            variant="secondary"
            onPress={() => navigation.navigate('MenuTab')}
            style={{ marginTop: 8 }}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.iconCircleError}>
            <Text style={styles.iconText}>❌</Text>
          </View>
          <Text style={styles.title}>Payment Verification Failed</Text>
          <Text style={styles.subtitle}>
            {errorMsg || 'We could not confirm your online payment with Stripe.'}
          </Text>

          <View style={styles.btnRow}>
            <CustomButton
              title="Back to Orders"
              variant="primary"
              onPress={() => navigation.navigate('MyOrdersTab')}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  content: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6
  },
  iconCircleSuccess: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  iconCircleError: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  iconText: {
    fontSize: 32
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20
  },
  priceHighlight: {
    color: COLORS.accent,
    fontWeight: '700'
  },
  receiptBox: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  receiptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6
  },
  receiptLabel: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  receiptVal: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600'
  },
  receiptValBold: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '800'
  },
  receiptValSlot: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700'
  },
  receiptValAmount: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '800'
  },
  receiptValTime: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  paidBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.success
  },
  btnRow: {
    flexDirection: 'row',
    width: '100%'
  }
});
