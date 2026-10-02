import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Alert,
  RefreshControl,
  Platform,
  Modal,
  ScrollView,
  Image
} from 'react-native';
import { userApi, UserItem } from '../api/userApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { getImageUrl } from '../utils/config';
import { COLORS } from '../theme/theme';

export const AdminUsersScreen = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'all' | 'chef' | 'student'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserForModal, setSelectedUserForModal] = useState<UserItem | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await userApi.getUsers(selectedRole, searchQuery);
      setUsers(data);
    } catch (err: any) {
      const msg = err.message || 'Failed to fetch users list';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRole, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleToggleVerify = async (user: UserItem) => {
    const nextStatus = !user.isVerified;
    const actionText = nextStatus ? 'Verify' : 'Revoke Verification of';

    const confirmAction = async () => {
      try {
        await userApi.toggleVerification(user._id, nextStatus);
        const msg = `Chef "${user.name}" has been ${nextStatus ? 'verified' : 'unverified'}!`;
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Success', msg);
        }
        // Update modal state if open
        if (selectedUserForModal && selectedUserForModal._id === user._id) {
          setSelectedUserForModal((prev) => (prev ? { ...prev, isVerified: nextStatus } : null));
        }
        fetchUsers();
      } catch (err: any) {
        const msg = err.message || 'Failed to update verification status';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Error', msg);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to ${actionText.toLowerCase()} ${user.name}?`)) {
        await confirmAction();
      }
    } else {
      Alert.alert(
        'Chef Verification',
        `Are you sure you want to ${actionText.toLowerCase()} ${user.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: nextStatus ? 'Verify' : 'Revoke', onPress: confirmAction }
        ]
      );
    }
  };

  if (loading && !refreshing) {
    return <LoadingSpinner message="Loading registered users..." />;
  }

  const chefsCount = users.filter((u) => u.role === 'chef').length;
  const studentsCount = users.filter((u) => u.role === 'student').length;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Summary */}
      <View style={styles.summaryBar}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Registered</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: COLORS.primary }]}>{chefsCount}</Text>
          <Text style={styles.statLabel}>Chefs</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: COLORS.success }]}>{studentsCount}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
      </View>

      {/* Role Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'chef', 'student'] as const).map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.filterPill, selectedRole === role && styles.filterPillActive]}
            onPress={() => setSelectedRole(role)}
          >
            <Text style={[styles.filterText, selectedRole === role && styles.filterTextActive]}>
              {role === 'all' ? 'All Users' : role === 'chef' ? '🍳 Chefs' : '🎓 Students'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search by name, email, phone or Student ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.textSecondary}
        />
      </View>

      {/* Users List */}
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyText}>No registered users found.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isChef = item.role === 'chef';
          const isAdmin = item.role === 'admin';
          const isVerified = item.isVerified ?? true;
          const avatarUrl = item.profilePicture ? getImageUrl(item.profilePicture) : null;

          return (
            <TouchableOpacity
              style={styles.userCard}
              activeOpacity={0.85}
              onPress={() => setSelectedUserForModal(item)}
            >
              <View style={styles.cardHeader}>
                {/* Profile Picture / Avatar Icon */}
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.cardAvatarImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.cardAvatarCircle, isAdmin ? styles.roleAdmin : isChef ? styles.roleChef : styles.roleStudent]}>
                    <Text style={styles.cardAvatarText}>{(item.name || 'U').charAt(0).toUpperCase()}</Text>
                  </View>
                )}

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.userNameClickable}>
                      {item.name} <Text style={styles.clickHint}>🔍 (Details)</Text>
                    </Text>
                    <View
                      style={[
                        styles.roleBadge,
                        isAdmin
                          ? styles.roleAdmin
                          : isChef
                          ? styles.roleChef
                          : styles.roleStudent
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          isAdmin
                            ? styles.roleAdminText
                            : isChef
                            ? styles.roleChefText
                            : styles.roleStudentText
                        ]}
                      >
                        {isAdmin ? 'System Admin' : isChef ? 'Kitchen Chef' : 'Student'}
                      </Text>
                    </View>
                  </View>
                  {item.email ? <Text style={styles.userSubText}>📧 {item.email}</Text> : null}
                  {item.username ? <Text style={styles.userSubText}>👤 @{item.username}</Text> : null}
                </View>

                {/* Verification Badge for Chefs */}
                {isChef ? (
                  <View style={[styles.verifyBadge, isVerified ? styles.verifyOk : styles.verifyPending]}>
                    <Text style={[styles.verifyBadgeText, isVerified ? styles.verifyOkText : styles.verifyPendingText]}>
                      {isVerified ? 'Verified ✅' : 'Pending ⏳'}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Extra details row */}
              <View style={styles.detailsRow}>
                {item.phone ? <Text style={styles.detailItem}>📞 {item.phone}</Text> : null}
                {item.studentId ? <Text style={styles.detailItem}>🪪 ID: {item.studentId}</Text> : null}
                {item.gender ? <Text style={styles.detailItem}>👤 {item.gender}</Text> : null}
              </View>

              {/* Admin Action for Chef Verification */}
              {isChef ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.verifyBtn, isVerified ? styles.verifyBtnRevoke : styles.verifyBtnApprove]}
                    onPress={(e) => {
                      // Prevent triggering parent card click
                      if (e && e.stopPropagation) e.stopPropagation();
                      handleToggleVerify(item);
                    }}
                  >
                    <Text style={styles.verifyBtnText}>
                      {isVerified ? '❌ Revoke Verification' : '✅ Verify Chef Account'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

      {/* Full User Details Modal */}
      <Modal
        visible={!!selectedUserForModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedUserForModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedUserForModal(null)}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalCard}>
              {/* Close "X" Button top right */}
              <TouchableOpacity
                style={styles.closeXBtn}
                onPress={() => setSelectedUserForModal(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeXText}>✕</Text>
              </TouchableOpacity>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                {selectedUserForModal ? (
                  <>
                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                      {selectedUserForModal.profilePicture ? (
                        <Image
                          source={{ uri: getImageUrl(selectedUserForModal.profilePicture) }}
                          style={styles.modalAvatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarText}>
                            {selectedUserForModal.role === 'admin'
                              ? '⚙️'
                              : selectedUserForModal.role === 'chef'
                              ? '👨‍🍳'
                              : '🎓'}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.modalName}>{selectedUserForModal.name}</Text>
                      <View style={styles.modalBadgesRow}>
                        <View
                          style={[
                            styles.roleBadge,
                            selectedUserForModal.role === 'admin'
                              ? styles.roleAdmin
                              : selectedUserForModal.role === 'chef'
                              ? styles.roleChef
                              : styles.roleStudent
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleBadgeText,
                              selectedUserForModal.role === 'admin'
                                ? styles.roleAdminText
                                : selectedUserForModal.role === 'chef'
                                ? styles.roleChefText
                                : styles.roleStudentText
                            ]}
                          >
                            {selectedUserForModal.role === 'admin'
                              ? 'System Admin'
                              : selectedUserForModal.role === 'chef'
                              ? 'Kitchen Chef'
                              : 'Student / Customer'}
                          </Text>
                        </View>

                        {selectedUserForModal.role === 'chef' ? (
                          <View
                            style={[
                              styles.verifyBadge,
                              selectedUserForModal.isVerified ? styles.verifyOk : styles.verifyPending
                            ]}
                          >
                            <Text
                              style={[
                                styles.verifyBadgeText,
                                selectedUserForModal.isVerified ? styles.verifyOkText : styles.verifyPendingText
                              ]}
                            >
                              {selectedUserForModal.isVerified ? 'Verified Chef ✅' : 'Verification Pending ⏳'}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Information List */}
                    <View style={styles.infoSection}>
                      <Text style={styles.sectionTitle}>Full User Profile Details</Text>

                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>🆔 User System ID:</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>{selectedUserForModal._id}</Text>
                      </View>

                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>👤 Full Name:</Text>
                        <Text style={styles.infoValue}>{selectedUserForModal.name}</Text>
                      </View>

                      {selectedUserForModal.username ? (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>🔖 Username:</Text>
                          <Text style={styles.infoValue}>@{selectedUserForModal.username}</Text>
                        </View>
                      ) : null}

                      {selectedUserForModal.email ? (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>📧 Email Address:</Text>
                          <Text style={styles.infoValue}>{selectedUserForModal.email}</Text>
                        </View>
                      ) : null}

                      {selectedUserForModal.phone ? (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>📞 Phone Number:</Text>
                          <Text style={styles.infoValue}>{selectedUserForModal.phone}</Text>
                        </View>
                      ) : null}

                      {selectedUserForModal.studentId ? (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>🪪 Student ID:</Text>
                          <Text style={[styles.infoValue, { color: COLORS.primary, fontWeight: '700' }]}>
                            {selectedUserForModal.studentId}
                          </Text>
                        </View>
                      ) : null}

                      {selectedUserForModal.gender ? (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>🚻 Gender:</Text>
                          <Text style={styles.infoValue}>{selectedUserForModal.gender}</Text>
                        </View>
                      ) : null}

                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>📅 Registration Date:</Text>
                        <Text style={styles.infoValue}>{formatDate(selectedUserForModal.createdAt)}</Text>
                      </View>

                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>🛡️ Account Role:</Text>
                        <Text style={styles.infoValue}>
                          {selectedUserForModal.role.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Actions inside Modal */}
                    <View style={styles.modalActionsRow}>
                      {selectedUserForModal.role === 'chef' ? (
                        <TouchableOpacity
                          style={[
                            styles.modalVerifyBtn,
                            selectedUserForModal.isVerified ? styles.verifyBtnRevoke : styles.verifyBtnApprove
                          ]}
                          onPress={() => handleToggleVerify(selectedUserForModal)}
                        >
                          <Text style={styles.verifyBtnText}>
                            {selectedUserForModal.isVerified ? '❌ Revoke Verification' : '✅ Verify Chef Account'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={() => setSelectedUserForModal(null)}
                      >
                        <Text style={styles.closeBtnText}>✖ Close Details Window</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : null}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    justifyContent: 'space-around'
  },
  statBox: {
    alignItems: 'center'
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 2
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 8
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.border
  },
  filterPillActive: {
    backgroundColor: COLORS.primary
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  filterTextActive: {
    color: '#FFFFFF'
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text
  },
  listContent: {
    padding: 16
  },
  userCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4
  },
  userNameClickable: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text
  },
  clickHint: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '600'
  },
  userSubText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12
  },
  roleAdmin: { backgroundColor: COLORS.primaryLight },
  roleChef: { backgroundColor: COLORS.primaryLight },
  roleStudent: { backgroundColor: '#DCFCE7' },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
  roleAdminText: { color: COLORS.primary },
  roleChefText: { color: COLORS.primary },
  roleStudentText: { color: COLORS.success },

  verifyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  verifyOk: { backgroundColor: '#DCFCE7' },
  verifyPending: { backgroundColor: '#FFF7ED' },
  verifyBadgeText: { fontSize: 11, fontWeight: '700' },
  verifyOkText: { color: COLORS.success },
  verifyPendingText: { color: COLORS.warning },

  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  detailItem: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500'
  },

  actionRow: {
    marginTop: 12,
    alignItems: 'flex-end'
  },
  verifyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  verifyBtnApprove: {
    backgroundColor: COLORS.success
  },
  verifyBtnRevoke: {
    backgroundColor: COLORS.error
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    overflow: 'hidden',
    elevation: 5,
    position: 'relative'
  },
  closeXBtn: {
    position: 'absolute',
    top: 12,
    right: 14,
    zIndex: 10,
    backgroundColor: COLORS.background,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeXText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textSecondary
  },
  modalScroll: {
    padding: 20
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 16,
    marginBottom: 16,
    marginTop: 8
  },
  cardAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.primary
  },
  cardAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text
  },
  modalAvatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 10
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  avatarText: {
    fontSize: 32
  },
  modalName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center'
  },
  modalBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  infoSection: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    flex: 1
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1.5,
    textAlign: 'right'
  },
  modalActionsRow: {
    gap: 10
  },
  modalVerifyBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  closeBtn: {
    backgroundColor: COLORS.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text
  }
});
