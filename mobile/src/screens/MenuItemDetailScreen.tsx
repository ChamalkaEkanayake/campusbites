import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image
} from 'react-native';
import { menuApi, MenuItem } from '../api/menuApi';
import { getImageUrl } from '../utils/config';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CustomButton } from '../components/CustomButton';
import { COLORS } from '../theme/theme';

export const MenuItemDetailScreen = ({ route, navigation }: any) => {
  const { id } = route.params;
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const data = await menuApi.getMenuItemById(id);
        setItem(data);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load item details');
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading food item details..." />;
  }

  if (errorMsg || !item) {
    return (
      <View style={styles.errorCenter}>
        <Text style={styles.errorText}>{errorMsg || 'Item not found'}</Text>
        <CustomButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  const imageUrl = getImageUrl(item.image);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {imageUrl && !imageError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={() => {
              console.log('Detail image failed to load:', imageUrl);
              setImageError(true);
            }}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderIcon}>🍱</Text>
            <Text style={styles.imagePlaceholderText}>No Image Available</Text>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Text style={styles.categoryBadge}>{item.category}</Text>
            <Text style={styles.prepTime}>⏱ {item.preparationTimeMinutes} mins prep time</Text>
          </View>

          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.price}>Rs. {item.price.toFixed(2)}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{item.description}</Text>

          <View style={styles.stockBox}>
            <Text style={styles.stockLabel}>Daily Stock Limit:</Text>
            <Text
              style={[
                styles.stockValue,
                item.dailyStock > 0 ? styles.inStock : styles.outOfStock
              ]}
            >
              {item.dailyStock > 0 ? `${item.dailyStock} portions available today` : 'Sold Out for Today'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Floating Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.priceLabel}>Total Price</Text>
          <Text style={styles.totalPrice}>Rs. {item.price.toFixed(2)}</Text>
        </View>

        <CustomButton
          title={item.isAvailable && item.dailyStock > 0 ? "Pre-order Now" : "Currently Unavailable"}
          onPress={() => navigation.navigate('CreateOrder', { menuItem: item })}
          disabled={!item.isAvailable || item.dailyStock <= 0}
          variant="accent"
          style={styles.orderBtn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface
  },
  scrollContent: {
    paddingBottom: 90
  },
  image: {
    width: '100%',
    height: 240,
    backgroundColor: '#E2E8F0'
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  imagePlaceholderIcon: {
    fontSize: 48,
    marginBottom: 8
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  body: {
    padding: 20
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  categoryBadge: {
    backgroundColor: COLORS.primaryLight,
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  prepTime: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.accent,
    marginBottom: 16
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 20
  },
  stockBox: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  stockLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '700'
  },
  inStock: {
    color: COLORS.success
  },
  outOfStock: {
    color: COLORS.error
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 8
  },
  priceLabel: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.accent
  },
  orderBtn: {
    flex: 1,
    marginLeft: 20
  },
  errorCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center'
  }
});
