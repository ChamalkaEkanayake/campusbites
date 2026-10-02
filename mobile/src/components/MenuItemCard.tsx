import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { MenuItem } from '../api/menuApi';
import { getImageUrl } from '../utils/config';
import { COLORS } from '../theme/theme';

interface MenuItemCardProps {
  item: MenuItem;
  onPress: () => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onPress }) => {
  const [imageError, setImageError] = useState(false);

  // Construct absolute image URL using centralised helper
  const imageUrl = getImageUrl(item.image);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {imageUrl && !imageError ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
          onError={() => {
            console.log('MenuItemCard image failed to load:', imageUrl);
            setImageError(true);
          }}
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderIcon}>🍱</Text>
          <Text style={styles.imagePlaceholderText}>No Image Available</Text>
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.price}>Rs. {item.price.toFixed(2)}</Text>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.footerRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.prepTime}>⏱ {item.preparationTimeMinutes} min</Text>
            {item.isAvailable && item.dailyStock > 0 ? (
              <Text style={styles.stockAvailable}>In Stock ({item.dailyStock})</Text>
            ) : (
              <Text style={styles.stockSoldOut}>Sold Out</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  image: {
    width: '100%',
    height: 155,
    backgroundColor: '#E5E7EB'
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9'
  },
  imagePlaceholderIcon: {
    fontSize: 32,
    marginBottom: 4
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  content: {
    padding: 14
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.accent
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
    lineHeight: 18
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8
  },
  categoryBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  prepTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: 10
  },
  stockAvailable: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success
  },
  stockSoldOut: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error
  }
});
