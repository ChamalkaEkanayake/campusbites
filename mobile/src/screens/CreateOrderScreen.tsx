import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Platform
} from 'react-native';
import { orderApi } from '../api/orderApi';
import { paymentApi } from '../api/paymentApi';
import { MenuItem } from '../api/menuApi';
import { CustomButton } from '../components/CustomButton';
import { COLORS } from '../theme/theme';

const BREAK_SLOTS = [
  'Morning Break (10:30 AM - 10:45 AM)',
  'Lunch Break (12:30 PM - 01:15 PM)',
  'Evening Break (03:30 PM - 03:45 PM)'
];

export const CreateOrderScreen = ({ route, navigation }: any) => {
  const { menuItem }: { menuItem: MenuItem } = route.params;

  const [quantity, setQuantity] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState(BREAK_SLOTS[1]); // Default Lunch
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'CASH_ON_PICKUP'>('ONLINE');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const totalAmount = menuItem.price * quantity;

  const handleIncrement = () => {
    if (quantity < menuItem.dailyStock) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleSubmitOrder = async () => {
    try {
      setErrorMsg('');
      setLoading(true);

      if (paymentMethod === 'ONLINE') {
        // 💳 Stripe Online Payment Flow
        const session = await paymentApi.createCheckoutSession({
          menuItemId: menuItem._id,
          quantity,
          breakTimeSlot: selectedSlot,
          specialInstructions
        });

        if (session && session.checkoutUrl) {
          if (Platform.OS === 'web') {
            window.location.href = session.checkoutUrl;
          } else {
            const canOpen = await Linking.canOpenURL(session.checkoutUrl);
            if (canOpen) {
              await Linking.openURL(session.checkoutUrl);
            } else {
              Alert.alert('Payment Error', 'Unable to open Stripe payment window on device.');
            }
          }
        } else {
          throw new Error('Could not generate Stripe payment session.');
        }
      } else {
        // 💵 Cash on Pickup Flow
        await orderApi.createOrder({
          menuItemId: menuItem._id,
          quantity,
          breakTimeSlot: selectedSlot,
          specialInstructions,
          paymentMethod: 'CASH_ON_PICKUP'
        });

        if (Platform.OS === 'web') {
          window.alert(`🎉 Pre-order Placed!\n\nYour order for "${menuItem.name}" has been placed for ${selectedSlot}. Payment of LKR ${totalAmount.toFixed(2)} will be collected on pickup.`);
          navigation.navigate('MyOrdersTab');
        } else {
          Alert.alert(
            '🎉 Pre-order Placed!',
            `Your order for "${menuItem.name}" has been placed for ${selectedSlot}. Payment of LKR ${totalAmount.toFixed(2)} will be collected on pickup.`,
            [
              {
                text: 'View My Orders',
                onPress: () => navigation.navigate('MyOrdersTab')
              }
            ]
          );
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process pre-order checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Lecture Break Pre-order</Text>
      <Text style={styles.headerSub}>Select your preferred break slot & payment option</Text>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
        </View>
      ) : null}

      {/* Item Summary Card */}
      <View style={styles.itemSummary}>
        <Text style={styles.itemName}>{menuItem.name}</Text>
        <Text style={styles.itemCategory}>{menuItem.category}</Text>
        <Text style={styles.itemPrice}>Rs. {menuItem.price.toFixed(2)} / portion</Text>
      </View>

      {/* Quantity Picker */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Select Quantity</Text>
        <View style={styles.quantityRow}>
          <TouchableOpacity style={styles.qtyBtn} onPress={handleDecrement}>
            <Text style={styles.qtyBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{quantity}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={handleIncrement}>
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lecture Break Slot Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Select Lecture Break Slot *</Text>
        <Text style={styles.helperText}>
          Kitchen capacity is capped at 25 orders per break slot to ensure fresh pickup.
        </Text>

        {BREAK_SLOTS.map((slot) => {
          const isSelected = selectedSlot === slot;
          return (
            <TouchableOpacity
              key={slot}
              style={[styles.slotCard, isSelected ? styles.slotCardActive : null]}
              onPress={() => setSelectedSlot(slot)}
            >
              <View style={[styles.radioCircle, isSelected ? styles.radioCircleActive : null]} />
              <Text style={[styles.slotText, isSelected ? styles.slotTextActive : null]}>
                {slot}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Payment Method Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Select Payment Method *</Text>
        <Text style={styles.helperText}>
          Choose online card payment or pay cash at the canteen counter.
        </Text>

        {/* 💳 Online Payment (Stripe) */}
        <TouchableOpacity
          style={[styles.paymentCard, paymentMethod === 'ONLINE' ? styles.paymentCardActive : null]}
          onPress={() => setPaymentMethod('ONLINE')}
        >
          <View style={[styles.radioCircle, paymentMethod === 'ONLINE' ? styles.radioCircleActive : null]} />
          <View style={{ flex: 1 }}>
            <View style={styles.paymentTitleRow}>
              <Text style={[styles.paymentTitle, paymentMethod === 'ONLINE' ? styles.paymentTitleActive : null]}>
                💳 Pay Online
              </Text>
              <View style={styles.stripeBadge}>
                <Text style={styles.stripeBadgeText}>Stripe Test Mode</Text>
              </View>
            </View>
            <Text style={styles.paymentSub}>Instant card checkout via Stripe's secure portal.</Text>
          </View>
        </TouchableOpacity>

        {/* 💵 Cash on Pickup */}
        <TouchableOpacity
          style={[styles.paymentCard, paymentMethod === 'CASH_ON_PICKUP' ? styles.paymentCardActive : null]}
          onPress={() => setPaymentMethod('CASH_ON_PICKUP')}
        >
          <View style={[styles.radioCircle, paymentMethod === 'CASH_ON_PICKUP' ? styles.radioCircleActive : null]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.paymentTitle, paymentMethod === 'CASH_ON_PICKUP' ? styles.paymentTitleActive : null]}>
              💵 Cash on Pickup
            </Text>
            <Text style={styles.paymentSub}>Pay cash at canteen counter when picking up your food.</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Special Instructions Input */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Special Instructions (Optional)</Text>
        <TextInput
          style={styles.textArea}
          placeholder="e.g. Less spicy, extra sauce, allergy note..."
          placeholderTextColor={COLORS.textSecondary}
          multiline
          numberOfLines={3}
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
        />
      </View>

      {/* Billing Summary */}
      <View style={styles.billBox}>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Item Total ({quantity}x)</Text>
          <Text style={styles.billVal}>Rs. {totalAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Payment Mode</Text>
          <Text style={styles.billValMode}>
            {paymentMethod === 'ONLINE' ? '💳 Stripe Online' : '💵 Cash on Pickup'}
          </Text>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Canteen Service Fee</Text>
          <Text style={styles.billValFree}>FREE (Campus Pickup)</Text>
        </View>
        <View style={[styles.billRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border }]}>
          <Text style={styles.totalLabel}>Total Payable</Text>
          <Text style={styles.totalVal}>Rs. {totalAmount.toFixed(2)}</Text>
        </View>
      </View>

      <CustomButton
        title={
          loading
            ? 'Processing Order...'
            : paymentMethod === 'ONLINE'
            ? `💳 Pay LKR ${totalAmount.toFixed(2)} via Stripe`
            : '💵 Place Order — Pay on Pickup'
        }
        onPress={handleSubmitOrder}
        loading={loading}
        variant="accent"
        style={styles.submitBtn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  content: {
    padding: 20
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text
  },
  headerSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16
  },
  errorText: {
    color: COLORS.error,
    fontWeight: '600',
    fontSize: 13
  },
  itemSummary: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text
  },
  itemCategory: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.accent,
    marginTop: 6
  },
  section: {
    marginBottom: 20
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 10
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4
  },
  qtyBtn: {
    width: 38,
    height: 38,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  qtyBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary
  },
  qtyText: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 20,
    color: COLORS.text
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10
  },
  slotCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10
  },
  paymentCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight
  },
  paymentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text
  },
  paymentTitleActive: {
    color: COLORS.primary
  },
  stripeBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  stripeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1'
  },
  paymentSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    marginRight: 12,
    marginTop: 2
  },
  radioCircleActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary
  },
  slotText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  slotTextActive: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  textArea: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    textAlignVertical: 'top'
  },
  billBox: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  billLabel: {
    fontSize: 14,
    color: COLORS.textSecondary
  },
  billVal: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600'
  },
  billValMode: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700'
  },
  billValFree: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '700'
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.accent
  },
  submitBtn: {
    marginBottom: 30
  }
});
