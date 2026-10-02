import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform
} from 'react-native';
import { menuApi, MenuItem } from '../api/menuApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CustomButton } from '../components/CustomButton';
import { COLORS } from '../theme/theme';

export const AdminManageMenuScreen = ({ navigation }: any) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = async () => {
    try {
      const data = await menuApi.getMenuItems();
      setItems(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch menu items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchItems();
    const unsubscribe = navigation.addListener('focus', fetchItems);
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchItems();
  }, []);

  const handleDelete = (id: string, name: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to delete "${name}" from the canteen menu?`);
      if (confirmed) {
        (async () => {
          try {
            await menuApi.deleteMenuItem(id);
            window.alert(`"${name}" removed successfully.`);
            fetchItems();
          } catch (err: any) {
            window.alert(err.message || 'Failed to delete menu item');
          }
        })();
      }
      return;
    }

    Alert.alert(
      'Delete Menu Item?',
      `Are you sure you want to delete "${name}" from the canteen menu?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await menuApi.deleteMenuItem(id);
              Alert.alert('Deleted', `"${name}" removed successfully.`);
              fetchItems();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete menu item');
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return <LoadingSpinner message="Loading canteen menu items..." />;
  }

  return (
    <View style={styles.container}>
      {/* Top Banner Button */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Canteen Menu Management</Text>
        <CustomButton
          title="+ Add Food Item"
          variant="accent"
          onPress={() => navigation.navigate('AdminAddEditItem', { item: null })}
          style={styles.addBtn}
          textStyle={{ fontSize: 13 }}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemCat}>{item.category} • <Text style={styles.priceHighlight}>Rs. {item.price.toFixed(2)}</Text></Text>
              </View>
              <View style={[styles.stockBadge, item.dailyStock > 0 ? styles.stockOk : styles.stockZero]}>
                <Text style={[styles.stockBadgeText, item.dailyStock > 0 ? styles.stockOkText : styles.stockZeroText]}>
                  Stock: {item.dailyStock}
                </Text>
              </View>
            </View>

            <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => navigation.navigate('AdminAddEditItem', { item })}
              >
                <Text style={styles.editBtnText}>✏️ Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item._id, item.name)}
              >
                <Text style={styles.deleteBtnText}>🗑 Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  headerBar: {
    backgroundColor: COLORS.surface,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary
  },
  addBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  listContent: {
    padding: 16
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text
  },
  itemCat: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  priceHighlight: {
    color: COLORS.accent,
    fontWeight: '700'
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  stockOk: {
    backgroundColor: '#DCFCE7'
  },
  stockZero: {
    backgroundColor: '#FEE2E2'
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  stockOkText: {
    color: COLORS.success
  },
  stockZeroText: {
    color: COLORS.error
  },
  itemDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10
  },
  editBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error
  }
});
