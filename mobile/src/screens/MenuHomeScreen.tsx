import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { menuApi, MenuItem } from '../api/menuApi';
import { MenuItemCard } from '../components/MenuItemCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../theme/theme';

const CATEGORIES = ['All', 'Breakfast', 'Lunch', 'Snacks', 'Beverages'];

// Helper to determine time of day greeting
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

export const MenuHomeScreen = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { greeting, icon } = getGreeting();
  const rawName = user?.name || user?.username || 'Student';
  const firstName = rawName.trim().split(' ')[0];

  const fetchMenu = async () => {
    try {
      setErrorMsg('');
      const data = await menuApi.getMenuItems(selectedCategory, searchQuery);
      setItems(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load menu items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [selectedCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMenu();
  }, [selectedCategory, searchQuery]);

  const handleSearchSubmit = () => {
    setLoading(true);
    fetchMenu();
  };

  if (loading && !refreshing) {
    return <LoadingSpinner message="Fetching canteen food menu..." />;
  }

  return (
    <View style={styles.container}>
      {/* Time-based User Greeting Header */}
      <View style={styles.greetingContainer}>
        <Text style={styles.greetingTitle}>
          {icon} {greeting}, <Text style={styles.greetingName}>{firstName}</Text>!
        </Text>
        <Text style={styles.greetingSub}>
          Pre-order your favorite canteen meals for lecture breaks.
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search fried rice, kottu, coffee..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchSubmit}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Category Pills */}
      <View style={styles.categoryRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(cat) => cat}
          renderItem={({ item: cat }) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                style={[styles.categoryPill, isSelected ? styles.categoryPillActive : null]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected ? styles.categoryPillTextActive : null
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Food List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <MenuItemCard
            item={item}
            onPress={() => navigation.navigate('MenuItemDetail', { id: item._id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🍱</Text>
            <Text style={styles.emptyTitle}>No Menu Items Found</Text>
            <Text style={styles.emptySub}>
              {selectedCategory !== 'All'
                ? `No items available under category "${selectedCategory}".`
                : 'Check back later or pull down to refresh.'}
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
  greetingContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10
  },
  greetingTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text
  },
  greetingName: {
    color: COLORS.primary
  },
  greetingSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text
  },
  searchBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14
  },
  categoryRow: {
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  categoryPillTextActive: {
    color: '#FFFFFF'
  },
  listContent: {
    padding: 16
  },
  errorBox: {
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
    textAlign: 'center'
  }
});
