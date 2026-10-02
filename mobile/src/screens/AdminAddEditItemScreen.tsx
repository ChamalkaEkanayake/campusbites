import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Switch,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { menuApi, MenuItem } from '../api/menuApi';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';
import { getImageUrl } from '../utils/config';
import { COLORS } from '../theme/theme';

const CATEGORIES = ['Breakfast', 'Lunch', 'Snacks', 'Beverages'];

export const AdminAddEditItemScreen = ({ route, navigation }: any) => {
  const existingItem: MenuItem | null = route.params?.item || null;

  const [name, setName] = useState(existingItem?.name || '');
  const [description, setDescription] = useState(existingItem?.description || '');
  const [price, setPrice] = useState(existingItem ? String(existingItem.price) : '');
  const [category, setCategory] = useState<any>(existingItem?.category || 'Lunch');
  const [dailyStock, setDailyStock] = useState(existingItem ? String(existingItem.dailyStock) : '50');
  const [prepTime, setPrepTime] = useState(existingItem ? String(existingItem.preparationTimeMinutes) : '15');
  const [isAvailable, setIsAvailable] = useState(existingItem ? existingItem.isAvailable : true);

  const [imageUri, setImageUri] = useState<string | null>(
    existingItem ? getImageUrl(existingItem.image) : null
  );
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const pickImage = async () => {
    // Permission not required on web — the browser's file picker handles access
    if (Platform.OS !== 'web') {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Permission to access gallery is required for image upload.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setSelectedAsset(asset);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !description.trim() || !price.trim()) {
      setErrorMsg('Please fill in Name, Description, and Price.');
      return;
    }

    try {
      setErrorMsg('');
      setLoading(true);

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('price', price.trim());
      formData.append('category', category);
      formData.append('dailyStock', dailyStock.trim());
      formData.append('preparationTimeMinutes', prepTime.trim());
      formData.append('isAvailable', String(isAvailable));

      if (selectedAsset) {
        const uri = selectedAsset.uri;
        const filename = uri.split('/').pop()?.split('?')[0] || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const mimeType = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
        const safeName = filename.endsWith('.jpg') || filename.endsWith('.jpeg') || filename.endsWith('.png') || filename.endsWith('.webp')
          ? filename
          : `photo_${Date.now()}.jpg`;

        if (Platform.OS === 'web') {
          try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const file = new File([blob], safeName, { type: mimeType });
            formData.append('image', file);
          } catch (blobErr) {
            console.warn('Failed to convert blob URI to File:', blobErr);
          }
        } else {
          formData.append('image', {
            uri,
            name: safeName,
            type: mimeType
          } as any);
        }
      }

      if (existingItem) {
        await menuApi.updateMenuItem(existingItem._id, formData);
        if (Platform.OS === 'web') {
          window.alert('Menu item updated successfully!');
        } else {
          Alert.alert('Success', 'Menu item updated successfully!');
        }
      } else {
        await menuApi.createMenuItem(formData);
        if (Platform.OS === 'web') {
          window.alert('New menu item created successfully!');
        } else {
          Alert.alert('Success', 'New menu item created successfully!');
        }
      }

      navigation.goBack();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save menu item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>
        {existingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
      </Text>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Image Upload Area */}
      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.cameraIcon}>📸</Text>
            <Text style={styles.pickerText}>Upload Food Photo (Multer)</Text>
          </View>
        )}
      </TouchableOpacity>

      <CustomInput
        label="Food Item Name *"
        placeholder="e.g. Chicken Kottu Roti"
        value={name}
        onChangeText={setName}
      />

      <CustomInput
        label="Description *"
        placeholder="e.g. Freshly made Kottu Roti with chicken curry"
        multiline
        numberOfLines={3}
        value={description}
        onChangeText={setDescription}
      />

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <CustomInput
            label="Price (LKR) *"
            placeholder="e.g. 450"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
        </View>
        <View style={{ flex: 1 }}>
          <CustomInput
            label="Daily Stock Limit *"
            placeholder="e.g. 50"
            keyboardType="numeric"
            value={dailyStock}
            onChangeText={setDailyStock}
          />
        </View>
      </View>

      <CustomInput
        label="Prep Time (Minutes)"
        placeholder="e.g. 15"
        keyboardType="numeric"
        value={prepTime}
        onChangeText={setPrepTime}
      />

      {/* Category Selection */}
      <Text style={styles.label}>Select Category</Text>
      <View style={styles.categoryRow}>
        {CATEGORIES.map((cat) => {
          const isSelected = category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.catPill, isSelected ? styles.catPillActive : null]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.catText, isSelected ? styles.catTextActive : null]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Availability Toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.label}>Item Available for Pre-order?</Text>
        <Switch
          value={isAvailable}
          onValueChange={setIsAvailable}
          trackColor={{ false: '#D1D5DB', true: COLORS.primaryLight }}
          thumbColor={isAvailable ? COLORS.primary : '#F3F4F6'}
        />
      </View>

      <CustomButton
        title={existingItem ? 'Update Menu Item' : 'Create Menu Item'}
        variant="accent"
        onPress={handleSave}
        loading={loading}
        style={styles.saveBtn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface
  },
  content: {
    padding: 20
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 16
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    fontSize: 13
  },
  imagePicker: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: 16
  },
  previewImage: {
    width: '100%',
    height: '100%'
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cameraIcon: {
    fontSize: 32,
    marginBottom: 6
  },
  pickerText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary
  },
  row: {
    flexDirection: 'row'
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.border
  },
  catPillActive: {
    backgroundColor: COLORS.primary
  },
  catText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  catTextActive: {
    color: '#FFFFFF'
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10
  },
  saveBtn: {
    marginBottom: 30
  }
});
