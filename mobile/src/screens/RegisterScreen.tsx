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

export const RegisterScreen = ({ navigation }: any) => {
  const { register } = useContext(AuthContext);

  // Selected Role: 'student' | 'chef' | 'admin'
  const [selectedRole, setSelectedRole] = useState<'student' | 'chef' | 'admin'>('student');

  // Form States
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [studentId, setStudentId] = useState('');

  const [adminSecretKey, setAdminSecretKey] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    setErrorMsg('');

    // Role-specific Frontend Validation
    if (selectedRole === 'admin') {
      if (!username.trim() || !password.trim()) {
        setErrorMsg('Admin registration requires Username and Password.');
        return;
      }
    } else if (selectedRole === 'chef') {
      if (!name.trim() || !email.trim() || !password.trim() || !phone.trim() || !gender) {
        setErrorMsg('Chef registration requires Name, Email, Password, Phone Number, and Gender.');
        return;
      }
    } else {
      if (!name.trim() || !email.trim() || !password.trim()) {
        setErrorMsg('Student registration requires Name, Email, and Password.');
        return;
      }
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    // Secret key required for admin/chef
    if ((selectedRole === 'admin' || selectedRole === 'chef') && !adminSecretKey.trim()) {
      setErrorMsg('Please enter the Staff Secret Key to register as Admin or Chef.');
      return;
    }

    try {
      setLoading(true);
      await register({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        gender,
        studentId: studentId.trim(),
        role: selectedRole,
        isAdmin: selectedRole === 'admin',
        adminSecretKey: adminSecretKey.trim()
      } as any);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Email or Username may already be registered.');
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
        {/* CampusBites Official Logo Header */}
        <View style={styles.brandHeader}>
          <Image
            source={require('../assets/logo.jpg')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>

        {/* Role Selection Tabs */}
        <View style={styles.roleTabsContainer}>
          <TouchableOpacity
            style={[styles.roleTab, selectedRole === 'student' ? styles.roleTabActive : null]}
            onPress={() => {
              setSelectedRole('student');
              setErrorMsg('');
            }}
          >
            <Text style={[styles.roleTabText, selectedRole === 'student' ? styles.roleTabTextActive : null]}>
              🎓 Student
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleTab, selectedRole === 'chef' ? styles.roleTabActive : null]}
            onPress={() => {
              setSelectedRole('chef');
              setErrorMsg('');
            }}
          >
            <Text style={[styles.roleTabText, selectedRole === 'chef' ? styles.roleTabTextActive : null]}>
              🍳 Chef / Staff
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleTab, selectedRole === 'admin' ? styles.roleTabActive : null]}
            onPress={() => {
              setSelectedRole('admin');
              setErrorMsg('');
            }}
          >
            <Text style={[styles.roleTabText, selectedRole === 'admin' ? styles.roleTabTextActive : null]}>
              🔑 Admin
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Header Badge */}
        <View style={styles.header}>
          <Text style={styles.roleBadge}>
            {selectedRole === 'admin'
              ? '🔑 System Admin Registration'
              : selectedRole === 'chef'
              ? '🍳 Kitchen Chef / Staff Account'
              : '🎓 SLIIT Student Account'}
          </Text>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            {selectedRole === 'admin'
              ? 'Register with Username & Password to manage system access.'
              : selectedRole === 'chef'
              ? 'Enter Name, Email, Password, Phone, & Gender to manage kitchen orders.'
              : 'Join CampusBites for fast lecture break pre-orders.'}
          </Text>
        </View>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Dynamic Registration Form */}
        <View style={styles.form}>
          {/* Admin Form: Username, Password & Secret Key */}
          {selectedRole === 'admin' ? (
            <>
              <CustomInput
                label="Username *"
                placeholder="e.g. admin_master"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />

              <CustomInput
                label="Password (min 6 chars) *"
                placeholder="Enter admin password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <CustomInput
                label="Staff Secret Key *"
                placeholder="Enter the secret key provided by admin"
                secureTextEntry
                value={adminSecretKey}
                onChangeText={setAdminSecretKey}
              />
            </>
          ) : null}

          {/* Kitchen Staff / Chef Form: Name, Email, Password, Phone, Male/Female Gender */}
          {selectedRole === 'chef' ? (
            <>
              <CustomInput
                label="Full Name *"
                placeholder="e.g. Saman Kumara"
                value={name}
                onChangeText={setName}
              />

              <CustomInput
                label="Email Address *"
                placeholder="e.g. chef.saman@canteen.sliit.lk"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <CustomInput
                label="Password (min 6 chars) *"
                placeholder="Create password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <CustomInput
                label="Phone Number *"
                placeholder="e.g. 0771234567"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <CustomInput
                label="Staff Secret Key *"
                placeholder="Enter the secret key provided by admin"
                secureTextEntry
                value={adminSecretKey}
                onChangeText={setAdminSecretKey}
              />

              {/* Gender Selector (Male / Female) */}
              <View style={styles.genderContainer}>
                <Text style={styles.genderLabel}>Gender *</Text>
                <View style={styles.genderRow}>
                  <TouchableOpacity
                    style={[styles.genderBtn, gender === 'Male' ? styles.genderBtnActive : null]}
                    onPress={() => setGender('Male')}
                  >
                    <Text style={[styles.genderBtnText, gender === 'Male' ? styles.genderBtnTextActive : null]}>
                      👨 Male
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.genderBtn, gender === 'Female' ? styles.genderBtnActive : null]}
                    onPress={() => setGender('Female')}
                  >
                    <Text style={[styles.genderBtnText, gender === 'Female' ? styles.genderBtnTextActive : null]}>
                      👩 Female
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : null}

          {/* Student Form: Name, Email, StudentId, Password, Phone, Gender */}
          {selectedRole === 'student' ? (
            <>
              <CustomInput
                label="Full Name *"
                placeholder="e.g. Kasun Perera"
                value={name}
                onChangeText={setName}
              />

              <CustomInput
                label="Email Address *"
                placeholder="e.g. kasun@my.sliit.lk"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <CustomInput
                label="Student ID"
                placeholder="e.g. IT21001234"
                autoCapitalize="characters"
                value={studentId}
                onChangeText={setStudentId}
              />

              <CustomInput
                label="Password (min 6 chars) *"
                placeholder="Create a strong password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <CustomInput
                label="Phone Number (Optional)"
                placeholder="e.g. 0712345678"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              {/* Gender Selector for Student */}
              <View style={styles.genderContainer}>
                <Text style={styles.genderLabel}>Gender (Optional)</Text>
                <View style={styles.genderRow}>
                  <TouchableOpacity
                    style={[styles.genderBtn, gender === 'Male' ? styles.genderBtnActive : null]}
                    onPress={() => setGender(gender === 'Male' ? '' : 'Male')}
                  >
                    <Text style={[styles.genderBtnText, gender === 'Male' ? styles.genderBtnTextActive : null]}>
                      👨 Male
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.genderBtn, gender === 'Female' ? styles.genderBtnActive : null]}
                    onPress={() => setGender(gender === 'Female' ? '' : 'Female')}
                  >
                    <Text style={[styles.genderBtnText, gender === 'Female' ? styles.genderBtnTextActive : null]}>
                      👩 Female
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : null}

          <CustomButton
            title={
              selectedRole === 'admin'
                ? 'Register Admin'
                : selectedRole === 'chef'
                ? 'Register Chef / Staff'
                : 'Create Student Account'
            }
            onPress={handleRegister}
            loading={loading}
            variant="accent"
            style={styles.submitBtn}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Sign In</Text>
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
    padding: 20,
    justifyContent: 'center'
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 16
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 18,
    elevation: 3
  },
  roleTabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  roleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10
  },
  roleTabActive: {
    backgroundColor: COLORS.primary,
    elevation: 2
  },
  roleTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  roleTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  header: {
    marginBottom: 20,
    alignItems: 'center'
  },
  roleBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
  genderContainer: {
    marginBottom: 16
  },
  genderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center'
  },
  genderBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary
  },
  genderBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  genderBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700'
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
