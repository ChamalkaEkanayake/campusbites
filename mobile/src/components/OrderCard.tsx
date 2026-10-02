import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Order } from '../api/orderApi';
import { CustomButton } from './CustomButton';
import { COLORS } from '../theme/theme';

interface OrderCardProps {
  order: Order;
  isAdmin?: boolean;
  onCancel?: () => void;
  onUpdateStatus?: (newStatus: string) => void;
  onConfirmCashPayment?: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  isAdmin = false,
  onCancel,
  onUpdateStatus,
  onConfirmCashPayment
}) => {
  const getStatusBadgeColor = () => {
    switch (order.status) {
      case 'Pending':
        return { bg: '#FFF7ED', text: '#EA580C' }; // Orange warning tint
      case 'Preparing':
        return { bg: '#E6F0FA', text: '#00529B' }; // SLIIT Blue tint
      case 'Ready':
        return { bg: '#DCFCE7', text: '#16A34A' }; // Success green tint
      case 'Completed':
        return { bg: '#F3F4F6', text: '#4B5563' };
      case 'Cancelled':
        return { bg: '#FEE2E2', text: '#DC2626' };
      default:
        return { bg: '#F3F4F6', text: '#4B5563' };
    }
  };

  const badgeColors = getStatusBadgeColor();
  const formattedDate = new Date(order.createdAt).toLocaleString();

  const isPaid = order.paymentStatus === 'PAID';
  const isCash = order.paymentMethod === 'CASH_ON_PICKUP';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.orderMeta}>
          <Text style={styles.orderId}>Order #{order._id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.orderDate}>{formattedDate}</Text>
        </View>

        <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
          <Text style={[styles.badgeText, { color: badgeColors.text }]}>{order.status}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.body}>
        <Text style={styles.itemTitle}>{order.menuItem?.name || 'Item Unavailable'}</Text>
        <Text style={styles.itemCategory}>{order.menuItem?.category}</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Quantity:</Text>
          <Text style={styles.detailValue}>{order.quantity}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Break Slot:</Text>
          <Text style={styles.detailValueBold}>{order.breakTimeSlot}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Amount:</Text>
          <Text style={styles.priceValue}>Rs. {order.totalAmount.toFixed(2)}</Text>
        </View>

        {/* Payment Info Rows */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Method:</Text>
          <Text style={styles.detailValue}>
            {isCash ? '💵 Cash on Pickup' : '💳 Stripe Online'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Status:</Text>
          <View style={[styles.payBadge, isPaid ? styles.payBadgePaid : styles.payBadgePending]}>
            <Text style={[styles.payBadgeText, isPaid ? styles.payBadgePaidText : styles.payBadgePendingText]}>
              {isPaid ? 'PAID ✅' : 'PENDING ⏳'}
            </Text>
          </View>
        </View>

        {order.specialInstructions ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>Instructions:</Text>
            <Text style={styles.noteText}>{order.specialInstructions}</Text>
          </View>
        ) : null}

        {isAdmin && order.user ? (
          <View style={styles.studentInfo}>
            <Text style={styles.studentLabel}>Customer: {order.user.name} ({order.user.studentId || order.user.email})</Text>
          </View>
        ) : null}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        {!isAdmin && order.status === 'Pending' && onCancel ? (
          <CustomButton
            title="Cancel Pre-order"
            variant="danger"
            onPress={onCancel}
            style={styles.actionBtn}
            textStyle={{ fontSize: 13 }}
          />
        ) : null}

        {/* Staff / Chef Order Management Actions */}
        {isAdmin ? (
          <View style={styles.adminActionContainer}>
            {/* Staff Cash Payment Confirmation Button */}
            {isCash && !isPaid && onConfirmCashPayment && order.status !== 'Cancelled' ? (
              <CustomButton
                title="💵 Confirm Cash Payment"
                variant="accent"
                onPress={onConfirmCashPayment}
                style={[styles.adminActionBtn, { marginBottom: 8 }]}
                textStyle={{ fontSize: 12 }}
              />
            ) : null}

            {onUpdateStatus && order.status !== 'Completed' && order.status !== 'Cancelled' ? (
              <View style={styles.adminStatusButtons}>
                {order.status === 'Pending' ? (
                  <CustomButton
                    title="Mark Preparing"
                    variant="primary"
                    onPress={() => onUpdateStatus('Preparing')}
                    style={styles.adminActionBtn}
                    textStyle={{ fontSize: 12 }}
                  />
                ) : null}

                {order.status === 'Preparing' ? (
                  <CustomButton
                    title="Mark Ready for Pickup"
                    variant="accent"
                    onPress={() => onUpdateStatus('Ready')}
                    style={styles.adminActionBtn}
                    textStyle={{ fontSize: 12 }}
                  />
                ) : null}

                {order.status === 'Ready' ? (
                  <CustomButton
                    title="Mark Completed"
                    variant="primary"
                    onPress={() => onUpdateStatus('Completed')}
                    style={styles.adminActionBtn}
                    textStyle={{ fontSize: 12 }}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  orderMeta: {
    flex: 1
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text
  },
  orderDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700'
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12
  },
  body: {
    marginBottom: 8
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text
  },
  itemCategory: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  detailValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500'
  },
  detailValueBold: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700'
  },
  priceValue: {
    fontSize: 15,
    color: COLORS.accent,
    fontWeight: '800'
  },
  payBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  payBadgePaid: {
    backgroundColor: '#DCFCE7'
  },
  payBadgePending: {
    backgroundColor: '#FFF7ED'
  },
  payBadgeText: {
    fontSize: 11,
    fontWeight: '800'
  },
  payBadgePaidText: {
    color: COLORS.success
  },
  payBadgePendingText: {
    color: COLORS.warning
  },
  noteBox: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
    marginTop: 8
  },
  noteTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  noteText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic'
  },
  studentInfo: {
    backgroundColor: COLORS.primaryLight,
    padding: 8,
    borderRadius: 6,
    marginTop: 8
  },
  studentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary
  },
  actions: {
    marginTop: 10
  },
  actionBtn: {
    paddingVertical: 8
  },
  adminActionContainer: {
    alignItems: 'flex-end'
  },
  adminStatusButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8
  },
  adminActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12
  }
});
