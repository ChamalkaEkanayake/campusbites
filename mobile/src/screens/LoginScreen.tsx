import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';
import { COLORS } from '../theme/theme';

export const LoginScreen = ({ navigation }: any) => {
  const { login } = useContext(AuthContext);

  const [portalMode, setPortalMode] = useState<'student' | 'admin'>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Please enter Username/Email and password.');
      return;
    }

    try {
      setErrorMsg('');
      setLoading(true);
      await login({
        email: identifier.trim(),
        username: identifier.trim(),
        password
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* CampusBites Official Logo Branding Header */}
        <View style={styles.brandHeader}>
          <Image
            source={require('../assets/logo.jpg')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>

        {/* Role Portal Segmented Toggle */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              portalMode === 'student' ? styles.segmentBtnActive : null
            ]}
            onPress={() => {
              setPortalMode('student');
              setErrorMsg('');
            }}
          >
            <Text
              style={[
                styles.segmentText,
                portalMode === 'student' ? styles.segmentTextActive : null
              ]}
            >
              🎓 Student Portal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              portalMode === 'admin' ? styles.segmentBtnActive : null
            ]}
            onPress={() => {
              setPortalMode('admin');
              setErrorMsg('');
            }}
          >
            <Text
              style={[
                styles.segmentText,
                portalMode === 'admin' ? styles.segmentTextActive : null
              ]}
            >
              🔑 Staff & Admin
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Header */}
        <View style={styles.header}>
          <Text style={styles.badgeText}>
            {portalMode === 'student'
              ? 'CampusBites — Student Portal'
              : 'CampusBites — Kitchen & Staff Portal'}
          </Text>

          <Text style={styles.title}>
            {portalMode === 'student' ? 'Welcome Back!' : 'Admin & Staff Login'}
          </Text>

          <Text style={styles.subtitle}>
            {portalMode === 'student'
              ? 'Pre-order your lecture break meals in seconds.'
              : 'Manage food menu items, categories and kitchen prep status.'}
          </Text>
        </View>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Login Form */}
        <View style={styles.form}>
          <CustomInput
            label={portalMode === 'student' ? 'Email / Student ID' : 'Username or Email'}
            placeholder={
              portalMode === 'student'
                ? 'e.g. it21001234@my.sliit.lk'
                : 'e.g. admin_master or chef@canteen.sliit.lk'
            }
            keyboardType="email-address"
            autoCapitalize="none"
            value={identifier}
            onChangeText={setIdentifier}
          />

          <CustomInput
            label="Password"
            placeholder="Enter your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <CustomButton
            title={portalMode === 'student' ? 'Sign In to Order' : 'Sign In to Kitchen Portal'}
            onPress={handleLogin}
            loading={loading}
            variant="accent"
            style={styles.submitBtn}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}>Register here</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center'
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 24,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primary,
    elevation: 2
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  header: {
    marginBottom: 20,
    alignItems: 'center'
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 8
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 10
  },
  form: {
    width: '100%'
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  errorBannerText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center'
  },
  submitBtn: {
    marginTop: 10
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700'
  }
});
