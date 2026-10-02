import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import { CustomButton } from '../components/CustomButton';
import { getImageUrl } from '../utils/config';
import { COLORS } from '../theme/theme';

export const ProfileScreen = () => {
  const { user, logout, updateUserData } = useContext(AuthContext);
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

  const roleLabel =
    user.role === 'admin'
      ? '🔑 System Administrator'
      : user.role === 'chef'
      ? '🍳 Kitchen Chef / Staff'
      : '🎓 SLIIT Student';

  const userAvatarUrl = user.profilePicture ? getImageUrl(user.profilePicture) : null;

  const pickAndUploadProfilePicture = async () => {
    // Media library permission check for mobile
    if (Platform.OS !== 'web') {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Permission to access photo gallery is required.');
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploading(true);

        const formData = new FormData();
        const uri = asset.uri;
        const filename = uri.split('/').pop()?.split('?')[0] || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const mimeType = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
        const safeName = `profile_${Date.now()}.jpg`;

        if (Platform.OS === 'web') {
          // Web Blob conversion
          const res = await fetch(uri);
          const blob = await res.blob();
          const file = new File([blob], safeName, { type: mimeType });
          formData.append('profilePicture', file);
        } else {
          // Native mobile FormData append
          formData.append('profilePicture', {
            uri,
            name: safeName,
            type: mimeType
          } as any);
        }

        const updatedUser = await authApi.uploadProfilePicture(formData);
        await updateUserData(updatedUser);

        if (Platform.OS === 'web') {
          window.alert('Profile picture updated successfully!');
        } else {
          Alert.alert('Success', 'Profile picture updated successfully!');
        }
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to upload profile picture';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* CampusBites Branding Banner */}
      <View style={styles.brandCard}>
        <Image
          source={require('../assets/logo.jpg')}
          style={styles.brandLogo}
          resizeMode="cover"
        />
        <View style={styles.brandTextContainer}>
          <Text style={styles.brandTitle}>CampusBites</Text>
          <Text style={styles.brandSubtitle}>SLIIT Canteen Pre-order Platform</Text>
        </View>
      </View>

      {/* Avatar Header with Profile Picture Upload */}
      <View style={styles.profileHeader}>
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={pickAndUploadProfilePicture}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {userAvatarUrl ? (
            <Image source={{ uri: userAvatarUrl }} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(user.name || user.username || 'A').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Camera Edit Badge - Orange Accent */}
          <View style={styles.cameraBadge}>
            {uploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.cameraBadgeIcon}>📷</Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={pickAndUploadProfilePicture} disabled={uploading}>
          <Text style={styles.changePhotoText}>
            {uploading ? 'Uploading Photo...' : '📷 Change Profile Picture'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.userName}>{user.name || user.username}</Text>
        {user.email ? <Text style={styles.userEmail}>{user.email}</Text> : null}

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{roleLabel}</Text>
        </View>
      </View>

      {/* Account Details Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Profile Info</Text>

        {user.name ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Full Name</Text>
            <Text style={styles.detailValue}>{user.name}</Text>
          </View>
        ) : null}

        {user.username ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Username</Text>
            <Text style={styles.detailValue}>@{user.username}</Text>
          </View>
        ) : null}

        {user.email ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email Address</Text>
            <Text style={styles.detailValue}>{user.email}</Text>
          </View>
        ) : null}

        {user.phone ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone Number</Text>
            <Text style={styles.detailValue}>{user.phone}</Text>
          </View>
        ) : null}

        {user.gender ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gender</Text>
            <Text style={styles.detailValue}>{user.gender === 'Male' ? '👨 Male' : '👩 Female'}</Text>
          </View>
        ) : null}

        {user.studentId ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Student ID</Text>
            <Text style={styles.detailValue}>{user.studentId}</Text>
          </View>
        ) : null}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Account Role</Text>
          <Text style={styles.detailValue}>{roleLabel}</Text>
        </View>
      </View>

      {/* Sign Out Button */}
      <CustomButton
        title="Sign Out"
        variant="danger"
        onPress={logout}
        style={styles.logoutBtn}
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
  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1
  },
  brandLogo: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12
  },
  brandTextContainer: {
    flex: 1
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary
  },
  brandSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4
  },
  avatarImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    borderColor: COLORS.primary
  },
  avatarCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 54,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: COLORS.accent,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 3
  },
  cameraBadgeIcon: {
    fontSize: 16
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10
  },
  roleBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 14
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text
  },
  logoutBtn: {
    marginTop: 10
  }
});
