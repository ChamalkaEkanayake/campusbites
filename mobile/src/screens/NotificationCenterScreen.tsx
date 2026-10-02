import React, { useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform
} from 'react-native';
import { NotificationContext } from '../context/NotificationContext';
import { Notification } from '../api/notificationApi';
import { COLORS } from '../theme/theme';

// ── Type → icon + colour mapping ────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  ORDER_PLACED:          { icon: '🛒', color: '#0284C7', bg: '#E0F2FE' },
  ORDER_ACCEPTED:        { icon: '✅', color: '#16A34A', bg: '#DCFCE7' },
  ORDER_PREPARING:       { icon: '👨‍🍳', color: '#D97706', bg: '#FEF3C7' },
  ORDER_READY:           { icon: '🎉', color: '#7C3AED', bg: '#EDE9FE' },
  ORDER_COMPLETED:       { icon: '✅', color: '#16A34A', bg: '#DCFCE7' },
  ORDER_CANCELLED:       { icon: '❌', color: '#DC2626', bg: '#FEE2E2' },
  PAYMENT_SUCCESS:       { icon: '💳', color: '#16A34A', bg: '#DCFCE7' },
  PAYMENT_FAILED:        { icon: '⚠️', color: '#DC2626', bg: '#FEE2E2' },
  CASH_PAYMENT_CONFIRMED:{ icon: '💵', color: '#16A34A', bg: '#DCFCE7' },
  RECEIPT_GENERATED:     { icon: '🧾', color: '#00529B', bg: '#E6F0FA' },
  NEW_ORDER:             { icon: '🍳', color: '#F58220', bg: '#FFF4EB' },
  CHEF_REGISTERED:       { icon: '👨‍🍳', color: '#7C3AED', bg: '#EDE9FE' },
  SYSTEM:                { icon: '🔔', color: '#6B7280', bg: '#F3F4F6' }
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.SYSTEM;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Single notification card ─────────────────────────────────────────────────
const NotifCard = ({
  item,
  onMarkRead,
  onDelete,
  onNavigate
}: {
  item: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (item: Notification) => void;
}) => {
  const cfg = getConfig(item.type);

  const handleDelete = () => {
    Alert.alert(
      'Delete Notification',
      'Remove this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(item._id) }
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.card, !item.isRead && styles.cardUnread]}
      onPress={() => onNavigate(item)}
      activeOpacity={0.8}
    >
      {/* Unread indicator stripe */}
      {!item.isRead && <View style={styles.unreadStripe} />}

      <View style={styles.cardInner}>
        {/* Icon bubble */}
        <View style={[styles.iconBubble, { backgroundColor: cfg.bg }]}>
          <Text style={styles.iconText}>{cfg.icon}</Text>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardTime}>{formatRelativeTime(item.createdAt)}</Text>
          </View>
          <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>

          {/* Actions */}
          <View style={styles.cardActions}>
            {!item.isRead && (
              <TouchableOpacity onPress={() => onMarkRead(item._id)} style={styles.actionBtn}>
                <Text style={[styles.actionText, { color: COLORS.primary }]}>✓ Mark read</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleDelete} style={styles.actionBtn}>
              <Text style={[styles.actionText, { color: COLORS.error }]}>🗑 Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyIcon}>🔔</Text>
    <Text style={styles.emptyTitle}>All caught up!</Text>
    <Text style={styles.emptyText}>
      You have no notifications yet. We'll let you know when something happens with your orders.
    </Text>
  </View>
);

// ── Main Screen ──────────────────────────────────────────────────────────────
export const NotificationCenterScreen = ({ navigation }: any) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useContext(NotificationContext);

  const handleNavigate = useCallback((item: Notification) => {
    // Mark as read when tapped
    if (!item.isRead) markAsRead(item._id);

    // Navigate to related order screens
    if (item.relatedOrderId) {
      const orderScreenTypes = [
        'ORDER_PLACED', 'ORDER_PREPARING', 'ORDER_READY', 'ORDER_COMPLETED',
        'ORDER_CANCELLED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'CASH_PAYMENT_CONFIRMED'
      ];
      if (orderScreenTypes.includes(item.type)) {
        try {
          navigation.navigate('MyOrdersTab');
        } catch {}
      }
      if (item.type === 'RECEIPT_GENERATED') {
        try {
          navigation.navigate('MyOrdersTab');
        } catch {}
      }
    }
  }, [markAsRead, navigation]);

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;
    Alert.alert(
      'Mark All as Read',
      `Mark all ${unreadCount} unread notifications as read?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark All', onPress: markAllAsRead }
      ]
    );
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <NotifCard
      item={item}
      onMarkRead={markAsRead}
      onDelete={deleteNotification}
      onNavigate={handleNavigate}
    />
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
        {isLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Text style={styles.loadMoreText}>Load more...</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>✓ Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.listContentEmpty
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && notifications.length === 0}
            onRefresh={refresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={isLoading ? null : <EmptyState />}
        ListFooterComponent={notifications.length > 0 ? renderFooter : null}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Loading overlay for initial load */}
      {isLoading && notifications.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },

  // Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1
  },
  markAllBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary
  },

  // List
  listContent: {
    padding: 12,
    paddingBottom: 40
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center'
  },
  separator: {
    height: 8
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3
  },
  cardUnread: {
    borderColor: COLORS.primary + '40',
    backgroundColor: COLORS.primaryLight + '60'
  },
  unreadStripe: {
    height: 3,
    backgroundColor: COLORS.primary
  },
  cardInner: {
    flexDirection: 'row',
    padding: 14,
    gap: 12
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0
  },
  iconText: {
    fontSize: 20
  },
  cardContent: {
    flex: 1
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 8
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1
  },
  cardTitleUnread: {
    fontWeight: '800',
    color: COLORS.primary
  },
  cardTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flexShrink: 0
  },
  cardMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 8
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12
  },
  actionBtn: {
    paddingVertical: 2
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700'
  },

  // Load more
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 14
  },
  loadMoreText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700'
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary
  }
});
