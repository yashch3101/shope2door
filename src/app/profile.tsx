import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';
import { useFocusEffect, useRouter } from 'expo-router';

import { getAccessToken, clearTokens } from '../services/auth.storage';
import { getMe, logout, type User } from '../services/auth.api';

const { width } = Dimensions.get('window');

const MENU_ITEMS = [
  {
    id: '1',
    title: 'Orders',
    icon: 'shopping-bag',
    type: 'Feather',
    route: '/orders',
  },
  {
    id: '2',
    title: 'Delivery Address',
    icon: 'location-outline',
    type: 'Ionicons',
    route: '/delivery-address',
  },
  {
    id: '3',
    title: 'Coupon',
    icon: 'ticket-outline',
    type: 'Ionicons',
    route: '/coupons',
  },
  {
    id: '4',
    title: 'Help',
    icon: 'help-circle',
    type: 'Feather',
    route: '/help',
  },
  {
    id: '5',
    title: 'About',
    icon: 'alert-circle',
    type: 'Feather',
    route: '/about',
  },
  {
    id: '6',
    title: 'Terms & Condition',
    icon: 'document-text-outline',
    type: 'Ionicons',
    route: '/terms',
  },
  {
    id: '7',
    title: 'Privacy Policy',
    icon: 'shield',
    type: 'Feather',
    route: '/privacy',
  },
  {
    id: '8',
    title: 'Shipping Policy',
    icon: 'refresh',
    type: 'Ionicons',
    route: '/shipping',
  },
];

export default function ProfileScreen() {
  const router = useRouter();

  // =====================================================
  // CUSTOM ANIMATED ALERT STATE
  // =====================================================
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info'
  });

  const showCustomAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // =====================================================
  // FETCH CURRENT USER
  // =====================================================

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      const accessToken = await getAccessToken();

      if (!accessToken) {
        setUser(null);
        router.replace('/');
        return;
      }

      const response = await getMe(accessToken);

      if (response.success && response.data) {
        setUser(response.data);
      } else {
        throw new Error(
          response.message || 'Unable to load profile',
        );
      }
    } catch (error: any) {
      console.log('Profile loading failed:', error);

      showCustomAlert(
        'Profile',
        error?.message || 'Unable to load your profile.', 'error'
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Reload whenever profile screen gets focus.
  // This also means when we return from Edit Profile,
  // the latest user data will be fetched.
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoggingOut(true);

              const accessToken =
                await getAccessToken();

              // Tell backend about logout if token exists.
              if (accessToken) {
                try {
                  await logout(accessToken);
                } catch (error) {
                  // Even if backend logout fails,
                  // local tokens must still be removed.
                  console.log(
                    'Backend logout failed:',
                    error,
                  );
                }
              }

              // Always clear local authentication.
              await clearTokens();

              setUser(null);

              // Prevent returning to protected profile
              // using the navigation back button.
              router.replace('/');
            } catch (error: any) {
              console.log(
                'Logout failed:',
                error,
              );

              showCustomAlert(
                'Logout Failed',
                error?.message ||
                  'Unable to logout. Please try again.',
                'error'
              );
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
    );
  }, [router]);

  // =====================================================
  // ICON HELPER
  // =====================================================

  const renderIcon = (
    type: string,
    name: any,
  ) => {
    if (type === 'Feather') {
      return (
        <Feather
          name={name}
          size={22}
          color="#1F2937"
        />
      );
    }

    return (
      <Ionicons
        name={name}
        size={24}
        color="#1F2937"
      />
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'left', 'right']}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFF"
        />

        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#EAB308"
          />

          <Text style={styles.loadingText}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // MAIN
  // =====================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFF"
      />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color="#1F2937"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* PROFILE INFO */}
        <MotiView
          from={{
            opacity: 0,
            scale: 0.9,
            translateY: -20,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            translateY: 0,
          }}
          transition={{
            type: 'spring',
            damping: 15,
          }}
          style={styles.profileHeader}
        >
          <View style={styles.avatarContainer}>
            <Ionicons
              name="person-outline"
              size={40}
              color="#FFF"
            />
          </View>

          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text
                style={styles.userName}
                numberOfLines={1}
              >
                {user?.name || 'User'}
              </Text>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  router.push('/edit-profile')
                }
              >
                <MaterialCommunityIcons
                  name="pencil"
                  size={17}
                  color="#EAB308"
                  style={styles.editIcon}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={styles.userEmail}
              numberOfLines={1}
            >
              {user?.email || ''}
            </Text>
          </View>
        </MotiView>

        <View style={styles.divider} />

        {/* MENU */}
        <View style={styles.menuContainer}>
          {MENU_ITEMS.map((item, index) => (
            <MotiView
              key={item.id}
              from={{
                opacity: 0,
                translateX: -20,
              }}
              animate={{
                opacity: 1,
                translateX: 0,
              }}
              transition={{
                type: 'timing',
                duration: 400,
                delay: 200 + index * 80,
              }}
            >
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => {
                  if (item.route) {
                    router.push(
                      item.route as any,
                    );
                  }
                }}
              >
                <View style={styles.menuItemLeft}>
                  {renderIcon(
                    item.type,
                    item.icon,
                  )}

                  <Text
                    style={styles.menuItemTitle}
                  >
                    {item.title}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#1F2937"
                />
              </TouchableOpacity>
            </MotiView>
          ))}
        </View>

        {/* LOGOUT */}
        <MotiView
          from={{
            opacity: 0,
            translateY: 30,
          }}
          animate={{
            opacity: 1,
            translateY: 0,
          }}
          transition={{
            type: 'spring',
            delay: 1000,
          }}
          style={styles.logoutContainer}
        >
          <TouchableOpacity
            style={[
              styles.logoutBtn,
              loggingOut &&
                styles.logoutBtnDisabled,
            ]}
            activeOpacity={0.8}
            disabled={loggingOut}
            onPress={handleLogout}
          >
            {loggingOut ? (
              <ActivityIndicator
                size="small"
                color="#FFF"
              />
            ) : (
              <>
                <Ionicons
                  name="power"
                  size={20}
                  color="#FFF"
                  style={{ marginRight: 8 }}
                />

                <Text style={styles.logoutText}>
                  Logout
                </Text>
              </>
            )}
          </TouchableOpacity>
        </MotiView>
      </ScrollView>

      {/* CUSTOM ANIMATED ALERT MODAL - OPTIMIZED FOR NO FREEZE */}
      <AnimatePresence>
        {alertConfig.visible && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 10000, elevation: 1000, justifyContent: 'center', alignItems: 'center' }]} pointerEvents="box-none">
            {/* BlurView ki jagah simple performance-friendly background use kiya hai */}
            <TouchableOpacity 
              activeOpacity={1}
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
              onPress={() => setAlertConfig({ ...alertConfig, visible: false })} 
            />
            
            <MotiView 
              from={{ scale: 0.8, opacity: 0, translateY: 20 }} 
              animate={{ scale: 1, opacity: 1, translateY: 0 }} 
              exit={{ scale: 0.8, opacity: 0, translateY: 20 }} 
              transition={{ type: 'timing', duration: 200 }} 
              style={styles.customAlertBox}
            >
              <View style={[styles.alertIconCircle, alertConfig.type === 'error' ? styles.alertIconError : alertConfig.type === 'success' ? styles.alertIconSuccess : alertConfig.type === 'warning' ? styles.alertIconWarning : styles.alertIconInfo]}>
                <Ionicons 
                  name={alertConfig.type === 'error' ? 'close' : alertConfig.type === 'success' ? 'checkmark' : alertConfig.type === 'warning' ? 'warning' : 'information'} 
                  size={32} 
                  color="#FFF" 
                />
              </View>
              <Text style={styles.customAlertTitle}>{alertConfig.title}</Text>
              <Text style={styles.customAlertMessage}>{alertConfig.message}</Text>
              
              <TouchableOpacity 
                activeOpacity={0.8}
                style={[styles.customAlertButton, alertConfig.type === 'error' ? styles.alertIconError : alertConfig.type === 'success' ? styles.alertIconSuccess : alertConfig.type === 'warning' ? styles.alertIconWarning : styles.alertIconInfo]}
                onPress={() => setAlertConfig({ ...alertConfig, visible: false })}
              >
                <Text style={styles.customAlertButtonText}>Okay</Text>
              </TouchableOpacity>
            </MotiView>
          </View>
        )}
      </AnimatePresence>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },

  scrollContent: {
    paddingBottom: 40,
  },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
    marginTop: 10,
  },

  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EAB308',
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

  userInfo: {
    marginLeft: 16,
    flex: 1,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    flexShrink: 1,
  },

  editIcon: {
    marginLeft: 7,
    marginTop: 2,
  },

  userEmail: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },

  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 24,
    marginBottom: 16,
  },

  menuContainer: {
    paddingHorizontal: 24,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  menuItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 16,
  },

  logoutContainer: {
    paddingHorizontal: 24,
    marginTop: 40,
  },

  logoutBtn: {
    backgroundColor: '#EAB308',
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
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

  logoutBtnDisabled: {
    opacity: 0.7,
  },

  logoutText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  customAlertBox: { width: width * 0.85, backgroundColor: '#FFF', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 25 },
  alertIconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  alertIconSuccess: { backgroundColor: '#10B981' },
  alertIconError: { backgroundColor: '#EF4444' },
  alertIconWarning: { backgroundColor: '#F59E0B' },
  alertIconInfo: { backgroundColor: '#3B82F6' },
  customAlertTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937', marginBottom: 8, textAlign: 'center' },
  customAlertMessage: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  customAlertButton: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  customAlertButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});