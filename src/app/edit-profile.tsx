import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import {
  MotiView,
} from 'moti';

import {
  useRouter,
} from 'expo-router';

import {
  getAccessToken,
} from '../services/auth.storage';

import {
  getMe,
  updateProfile,
} from '../services/auth.api';

export default function EditProfileScreen() {
  const router = useRouter();

  // =====================================================
  // STATE
  // =====================================================

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [name, setName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [phone, setPhone] =
    useState('');

  // =====================================================
  // LOAD CURRENT PROFILE
  // =====================================================

  const loadProfile = useCallback(
    async () => {
      try {
        setLoading(true);

        const accessToken =
          await getAccessToken();

        // -------------------------------------------------
        // USER NOT LOGGED IN
        // -------------------------------------------------

        if (!accessToken) {
          router.replace('/');
          return;
        }

        // -------------------------------------------------
        // GET CURRENT USER
        // -------------------------------------------------

        const response =
          await getMe(accessToken);

        if (
          response.success &&
          response.data
        ) {
          setName(
            response.data.name || '',
          );

          setEmail(
            response.data.email || '',
          );

          setPhone(
            response.data.phone || '',
          );
        } else {
          throw new Error(
            response.message ||
              'Unable to load profile.',
          );
        }
      } catch (error: any) {
        console.log(
          'Edit profile loading error:',
          error,
        );

        Alert.alert(
          'Profile Error',
          error?.message ||
            'Unable to load your profile.',
        );
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  // =====================================================
  // LOAD PROFILE ON SCREEN OPEN
  // =====================================================

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // =====================================================
  // UPDATE PROFILE
  // =====================================================

  const handleUpdate = async () => {
    const trimmedName =
      name.trim();

    const trimmedPhone =
      phone.trim();

    // -------------------------------------------------
    // NAME VALIDATION
    // -------------------------------------------------

    if (!trimmedName) {
      Alert.alert(
        'Name Required',
        'Please enter your name.',
      );
      return;
    }

    if (trimmedName.length < 2) {
      Alert.alert(
        'Invalid Name',
        'Name must be at least 2 characters.',
      );
      return;
    }

    // -------------------------------------------------
    // PHONE VALIDATION
    // -------------------------------------------------

    if (
      trimmedPhone &&
      !/^[6-9]\d{9}$/.test(
        trimmedPhone,
      )
    ) {
      Alert.alert(
        'Invalid Phone',
        'Please enter a valid 10-digit mobile number.',
      );
      return;
    }

    try {
      setSaving(true);

      // -------------------------------------------------
      // UPDATE BACKEND
      // -------------------------------------------------

      const response =
        await updateProfile({
          name: trimmedName,
          phone:
            trimmedPhone || undefined,
        });

      if (!response.success) {
        throw new Error(
          response.message ||
            'Unable to update profile.',
        );
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      Alert.alert(
        'Profile Updated',
        'Your profile has been updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ],
      );
    } catch (error: any) {
      console.log(
        'Profile update error:',
        error,
      );

      Alert.alert(
        'Update Failed',
        error?.message ||
          'Unable to update your profile. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // LOADING SCREEN
  // =====================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={[
          'top',
          'left',
          'right',
        ]}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFF"
        />

        <View
          style={styles.loadingContainer}
        >
          <ActivityIndicator
            size="large"
            color="#EAB308"
          />

          <Text
            style={styles.loadingText}
          >
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={[
        'top',
        'left',
        'right',
      ]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFF"
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <MotiView
          from={{
            opacity: 0,
            translateY: -20,
          }}
          animate={{
            opacity: 1,
            translateY: 0,
          }}
          transition={{
            type: 'timing',
            duration: 400,
          }}
          style={styles.header}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.backButton}
            onPress={() =>
              router.back()
            }
            disabled={saving}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color="#FFF"
            />
          </TouchableOpacity>

          <Text
            style={styles.headerTitle}
          >
            Edit Profile
          </Text>

          <View
            style={styles.headerSpacer}
          />
        </MotiView>

        {/* =================================================
            CONTENT
        ================================================= */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* =================================================
              AVATAR
          ================================================= */}

          <MotiView
            from={{
              opacity: 0,
              scale: 0.5,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              type: 'spring',
              damping: 12,
              delay: 150,
            }}
            style={styles.avatarWrapper}
          >
            <View
              style={styles.avatarContainer}
            >
              <Ionicons
                name="person-outline"
                size={60}
                color="#FFF"
              />
            </View>
          </MotiView>

          {/* =================================================
              FORM
          ================================================= */}

          <View
            style={styles.formContainer}
          >
            {/* ---------------------------------------------
                NAME
            --------------------------------------------- */}

            <MotiView
              from={{
                opacity: 0,
                translateY: 20,
              }}
              animate={{
                opacity: 1,
                translateY: 0,
              }}
              transition={{
                type: 'timing',
                duration: 400,
                delay: 300,
              }}
              style={styles.inputGroup}
            >
              <Text
                style={styles.label}
              >
                Full Name
              </Text>

              <View
                style={styles.inputWrapper}
              >
                <Ionicons
                  name="person-outline"
                  size={21}
                  color="#9CA3AF"
                />

                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  editable={!saving}
                  returnKeyType="next"
                />
              </View>
            </MotiView>

            {/* ---------------------------------------------
                EMAIL
            --------------------------------------------- */}

            <MotiView
              from={{
                opacity: 0,
                translateY: 20,
              }}
              animate={{
                opacity: 1,
                translateY: 0,
              }}
              transition={{
                type: 'timing',
                duration: 400,
                delay: 400,
              }}
              style={styles.inputGroup}
            >
              <Text
                style={styles.label}
              >
                Email Address
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  styles.disabledInputWrapper,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={21}
                  color="#9CA3AF"
                />

                <TextInput
                  style={[
                    styles.input,
                    styles.disabledInput,
                  ]}
                  value={email}
                  editable={false}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color="#9CA3AF"
                />
              </View>

              <Text
                style={styles.helperText}
              >
                Email address cannot be changed here.
              </Text>
            </MotiView>

            {/* ---------------------------------------------
                PHONE
            --------------------------------------------- */}

            <MotiView
              from={{
                opacity: 0,
                translateY: 20,
              }}
              animate={{
                opacity: 1,
                translateY: 0,
              }}
              transition={{
                type: 'timing',
                duration: 400,
                delay: 500,
              }}
              style={styles.inputGroup}
            >
              <Text
                style={styles.label}
              >
                Phone Number
              </Text>

              <View
                style={styles.inputWrapper}
              >
                <Ionicons
                  name="call-outline"
                  size={21}
                  color="#9CA3AF"
                />

                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!saving}
                  returnKeyType="done"
                />
              </View>
            </MotiView>
          </View>

          {/* =================================================
              UPDATE BUTTON
          ================================================= */}

          <MotiView
            from={{
              opacity: 0,
              translateY: 20,
            }}
            animate={{
              opacity: 1,
              translateY: 0,
            }}
            transition={{
              type: 'timing',
              duration: 400,
              delay: 600,
            }}
          >
            <TouchableOpacity
              style={[
                styles.updateBtn,
                saving &&
                  styles.updateBtnDisabled,
              ]}
              activeOpacity={0.8}
              onPress={handleUpdate}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color="#1F2937"
                />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="content-save-outline"
                    size={21}
                    color="#1F2937"
                  />

                  <Text
                    style={styles.updateBtnText}
                  >
                    Update
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </MotiView>

          {/* =================================================
              CANCEL BUTTON
          ================================================= */}

          <TouchableOpacity
            style={styles.cancelBtn}
            activeOpacity={0.7}
            onPress={() =>
              router.back()
            }
            disabled={saving}
          >
            <Text
              style={styles.cancelBtnText}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  keyboardContainer: {
    flex: 1,
  },

  // ===================================================
  // HEADER
  // ===================================================

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingHorizontal: 16,
    paddingVertical: 16,

    backgroundColor: '#FFF',

    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  backButton: {
    width: 40,
    height: 40,

    borderRadius: 20,

    backgroundColor: '#EAB308',

    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
  },

  headerSpacer: {
    width: 40,
  },

  // ===================================================
  // CONTENT
  // ===================================================

  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 50,
  },

  // ===================================================
  // AVATAR
  // ===================================================

  avatarWrapper: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 50,
  },

  avatarContainer: {
    width: 140,
    height: 140,

    borderRadius: 70,

    backgroundColor: '#EAB308',

    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#EAB308',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,

    elevation: 6,
  },

  // ===================================================
  // FORM
  // ===================================================

  formContainer: {
    marginBottom: 30,
  },

  inputGroup: {
    marginBottom: 24,
  },

  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },

  inputWrapper: {
    width: '100%',
    height: 56,

    flexDirection: 'row',
    alignItems: 'center',

    borderWidth: 1.5,
    borderColor: '#EAB308',

    borderRadius: 12,

    paddingHorizontal: 16,

    backgroundColor: '#FFF',
  },

  disabledInputWrapper: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },

  input: {
    flex: 1,

    marginLeft: 12,

    fontSize: 16,
    color: '#1F2937',

    paddingVertical: 0,
  },

  disabledInput: {
    color: '#6B7280',
  },

  helperText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
    marginLeft: 2,
  },

  // ===================================================
  // UPDATE BUTTON
  // ===================================================

  updateBtn: {
    width: '100%',
    height: 56,

    backgroundColor: '#EAB308',

    borderRadius: 12,

    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#EAB308',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,

    elevation: 5,
  },

  updateBtnDisabled: {
    opacity: 0.7,
  },

  updateBtnText: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },

  // ===================================================
  // CANCEL
  // ===================================================

  cancelBtn: {
    height: 50,

    justifyContent: 'center',
    alignItems: 'center',

    marginTop: 6,
  },

  cancelBtnText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '700',
  },

  // ===================================================
  // LOADING
  // ===================================================

  loadingContainer: {
    flex: 1,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: '#FFF',
  },

  loadingText: {
    marginTop: 12,

    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});