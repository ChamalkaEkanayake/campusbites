import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { orderApi, ReceiptPayload } from '../api/orderApi';
import { COLORS } from '../theme/theme';

export const ReceiptScreen = ({ route, navigation }: any) => {
  const { orderId } = route.params as { orderId: string };
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadReceipt();
  }, [orderId]);

  const loadReceipt = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      // generateReceipt is idempotent — returns existing if already exists
      const data = await orderApi.generateReceipt(orderId);
      setReceipt(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!receipt) return;
    try {
      await Share.share({
        message:
          `🧾 CampusBites Receipt\n` +
          `Receipt No: ${receipt.receiptNumber}\n` +
          `Item: ${receipt.item.name} × ${receipt.item.quantity}\n` +
          `Pickup Slot: ${receipt.breakTimeSlot}\n` +
          `Payment: ${receipt.paymentStatus}\n` +
          `Total: LKR ${receipt.totalPaid.toFixed(2)}\n\n` +
          `Pickup Token: ${receipt.pickupToken}\n` +
          `SLIIT Campus Canteen`
      });
    } catch {
      // user dismissed
    }
  };

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    } else {
      Alert.alert('Print / Save', 'Use the Share button to save or forward your receipt.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Generating your receipt...</Text>
      </View>
    );
  }

  if (errorMsg || !receipt) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorText}>{errorMsg || 'Receipt not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadReceipt}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPaid = receipt.paymentStatus === 'PAID';
  const isCash = receipt.paymentMethod === 'CASH_ON_PICKUP';
  const orderDate = new Date(receipt.orderDate);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Header Actions ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={handlePrint}>
          <Text style={styles.actionBtnText}>📥 Save / Print</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnShare]} onPress={handleShare}>
          <Text style={styles.actionBtnText}>📤 Share</Text>
        </TouchableOpacity>
      </View>

      {/* ── Receipt Card ── */}
      <View style={styles.receiptCard}>

        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🍱</Text>
          </View>
          <Text style={styles.brandName}>CampusBites</Text>
          <Text style={styles.brandSub}>SLIIT Campus Canteen Pre-order Platform</Text>
          <View style={styles.brandDivider} />
        </View>

        {/* Receipt Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Receipt Information</Text>
          <View style={styles.receiptNoBox}>
            <Text style={styles.receiptNoLabel}>Receipt No.</Text>
            <Text style={styles.receiptNo}>{receipt.receiptNumber}</Text>
          </View>
          <ReceiptRow label="Order Date" value={orderDate.toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' })} />
          <ReceiptRow label="Order Time" value={orderDate.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })} />
          <ReceiptRow label="Order ID" value={`#${receipt.orderId.toString().slice(-8).toUpperCase()}`} highlight />
          <ReceiptRow label="Status" value={receipt.status} />
        </View>

        <Divider />

        {/* Student Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎓 Student Information</Text>
          <ReceiptRow label="Name" value={receipt.student.name} />
          {receipt.student.studentId ? (
            <ReceiptRow label="Student ID" value={receipt.student.studentId} />
          ) : null}
          {receipt.student.email ? (
            <ReceiptRow label="Email" value={receipt.student.email} />
          ) : null}
        </View>

        <Divider />

        {/* Pickup Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Pickup Information</Text>
          <ReceiptRow label="Pickup Slot" value={receipt.breakTimeSlot} highlight />
          <ReceiptRow label="Pickup Location" value="SLIIT Campus Canteen" />
          {receipt.collectedAt ? (
            <ReceiptRow label="Collected At" value={new Date(receipt.collectedAt).toLocaleString()} />
          ) : null}
        </View>

        <Divider />

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛒 Ordered Items</Text>
          <View style={styles.itemsTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableCellItem]}>Item</Text>
              <Text style={styles.tableCell}>Qty</Text>
              <Text style={styles.tableCell}>Unit</Text>
              <Text style={[styles.tableCell, styles.tableCellRight]}>Total</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellItem, { fontWeight: '700', color: COLORS.text }]}>
                {receipt.item.name}
              </Text>
              <Text style={styles.tableCell}>{receipt.item.quantity}</Text>
              <Text style={styles.tableCell}>LKR {receipt.item.unitPrice.toFixed(0)}</Text>
              <Text style={[styles.tableCell, styles.tableCellRight, { fontWeight: '700', color: COLORS.accent }]}>
                LKR {receipt.item.total.toFixed(2)}
              </Text>
            </View>
          </View>
          {receipt.item.category ? (
            <Text style={styles.itemCategory}>Category: {receipt.item.category}</Text>
          ) : null}
        </View>

        <Divider />

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Payment Information</Text>
          <ReceiptRow
            label="Payment Method"
            value={isCash ? 'Cash on Pickup' : 'Online Payment (Stripe)'}
          />
          <View style={styles.payStatusRow}>
            <Text style={styles.receiptLabel}>Payment Status</Text>
            <View style={[styles.payBadge, isPaid ? styles.payBadgePaid : styles.payBadgePending]}>
              <Text style={[styles.payBadgeText, isPaid ? styles.payBadgePaidText : styles.payBadgePendingText]}>
                {receipt.paymentStatus} {isPaid ? '✅' : '⏳'}
              </Text>
            </View>
          </View>
          {receipt.stripePaymentIntentId ? (
            <ReceiptRow label="Transaction Ref" value={receipt.stripePaymentIntentId.slice(-16).toUpperCase()} />
          ) : null}
          {receipt.paidAt ? (
            <ReceiptRow label="Paid At" value={new Date(receipt.paidAt).toLocaleString()} />
          ) : null}
        </View>

        <Divider />

        {/* Total */}
        <View style={styles.totalBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalVal}>LKR {receipt.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Canteen Service Fee</Text>
            <Text style={[styles.totalVal, { color: COLORS.success }]}>FREE</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total {isPaid ? 'Paid' : 'Payable'}</Text>
            <Text style={styles.grandTotalVal}>LKR {receipt.totalPaid.toFixed(2)}</Text>
          </View>
        </View>

        <Divider />

        {/* QR Code */}
        <View style={styles.qrSection}>
          <Text style={styles.sectionTitle}>📲 Pickup QR Code</Text>
          <Text style={styles.qrHint}>Show this QR code when collecting your order at the canteen counter.</Text>

          <View style={styles.qrWrapper}>
            <View style={styles.qrBorder}>
              <QRCode
                value={receipt.pickupToken}
                size={180}
                color={COLORS.primary}
                backgroundColor="#FFFFFF"
              />
            </View>
            <Text style={styles.qrToken}>{receipt.pickupToken}</Text>
            <Text style={styles.qrSub}>
              {receipt.status === 'Completed'
                ? '✅ Order Already Collected'
                : '⏳ Present at Canteen Counter'}
            </Text>
          </View>

          <View style={styles.qrNotice}>
            <Text style={styles.qrNoticeText}>
              ⚠️ Do not share your QR code with others. This code is for your pickup verification only.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for ordering with CampusBites!</Text>
          <Text style={styles.footerSub}>SLIIT Campus Canteen — Pre-order Platform</Text>
          <Text style={styles.footerSub}>campusbites.sliit.lk</Text>
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={[styles.bottomBtn, { backgroundColor: COLORS.primary }]}
          onPress={() => navigation.navigate('MyOrdersTab')}
        >
          <Text style={styles.bottomBtnText}>📋 My Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bottomBtn, { backgroundColor: COLORS.accent }]}
          onPress={handleShare}
        >
          <Text style={styles.bottomBtnText}>📤 Share</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// ─── Small reusable sub-components ─────────────────────────────────
const ReceiptRow = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <View style={styles.row}>
    <Text style={styles.receiptLabel}>{label}</Text>
    <Text style={[styles.receiptValue, highlight && styles.receiptValueHighlight]}>{value}</Text>
  </View>
);

const Divider = () => <View style={styles.divider} />;

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32
  },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14 },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorText: { color: COLORS.error, textAlign: 'center', fontSize: 14, marginBottom: 16 },
  retryBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8
  },
  retryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  // Action row
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  actionBtn: {
    flex: 1, backgroundColor: COLORS.primary, paddingVertical: 10,
    borderRadius: 10, alignItems: 'center'
  },
  actionBtnShare: { backgroundColor: COLORS.accent },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  // Receipt card
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    marginBottom: 16
  },
  // Brand header
  brandHeader: {
    backgroundColor: COLORS.primary, alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20
  },
  logoCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center',
    alignItems: 'center', marginBottom: 10
  },
  logoText: { fontSize: 28 },
  brandName: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  brandSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  brandDivider: { width: 60, height: 3, backgroundColor: COLORS.accent, borderRadius: 2, marginTop: 14 },
  // Sections
  section: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.primary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  receiptNoBox: {
    backgroundColor: COLORS.background, borderRadius: 10,
    padding: 12, alignItems: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border
  },
  receiptNoLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
  receiptNo: { fontSize: 18, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  receiptLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  receiptValue: { fontSize: 13, color: COLORS.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  receiptValueHighlight: { color: COLORS.primary, fontWeight: '700' },
  // Items table
  itemsTable: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: 'hidden', marginBottom: 6 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: COLORS.primary,
    paddingVertical: 8, paddingHorizontal: 10
  },
  tableRow: {
    flexDirection: 'row', paddingVertical: 10,
    paddingHorizontal: 10, backgroundColor: '#FAFAFA'
  },
  tableCell: { flex: 1, fontSize: 12, color: '#FFFFFF' },
  tableCellItem: { flex: 2 },
  tableCellRight: { textAlign: 'right' },
  itemCategory: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  // Payment status
  payStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  payBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  payBadgePaid: { backgroundColor: '#DCFCE7' },
  payBadgePending: { backgroundColor: '#FFF7ED' },
  payBadgeText: { fontSize: 12, fontWeight: '800' },
  payBadgePaidText: { color: COLORS.success },
  payBadgePendingText: { color: COLORS.warning },
  // Total
  totalBox: { backgroundColor: COLORS.background, margin: 16, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { fontSize: 13, color: COLORS.textSecondary },
  totalVal: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  grandTotalRow: {
    marginTop: 8, paddingTop: 10,
    borderTopWidth: 1.5, borderTopColor: COLORS.primary
  },
  grandTotalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  grandTotalVal: { fontSize: 20, fontWeight: '900', color: COLORS.accent },
  // QR section
  qrSection: { padding: 16, alignItems: 'center' },
  qrHint: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  qrWrapper: { alignItems: 'center', marginBottom: 12 },
  qrBorder: {
    padding: 16, backgroundColor: '#FFFFFF',
    borderRadius: 16, borderWidth: 2, borderColor: COLORS.primary,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, marginBottom: 12
  },
  qrToken: { fontSize: 13, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.5, marginBottom: 6 },
  qrSub: { fontSize: 12, color: COLORS.textSecondary },
  qrNotice: {
    backgroundColor: '#FFF7ED', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#FED7AA', marginTop: 8, width: '100%'
  },
  qrNoticeText: { fontSize: 11, color: '#92400E', textAlign: 'center', lineHeight: 16 },
  // Footer
  footer: {
    backgroundColor: COLORS.primary, padding: 20, alignItems: 'center'
  },
  footerText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  footerSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  // Bottom buttons
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
  bottomRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  bottomBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    alignItems: 'center', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3
  },
  bottomBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 }
});
