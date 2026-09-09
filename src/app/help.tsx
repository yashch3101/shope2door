import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { getAppSettings } from '../services/settings.api';

const { width } = Dimensions.get('window');

export default function HelpScreen() {

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
  
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Dynamic Support Data State
  const [supportData, setSupportData] = useState({
    phone: '',
    whatsapp: '',
    email: ''
  });

  useEffect(() => {
    const fetchSupportSettings = async () => {
      try {
        const response = await getAppSettings();
        if (response.success && response.data) {
          setSupportData({
            phone: response.data.help?.phone || '+91 0000000000',
            whatsapp: response.data.help?.whatsapp || '+91 0000000000',
            email: response.data.help?.email || 'support@shop2door.com'
          });
        }
      } catch (error) {
      console.error("Failed to fetch settings", error);
      showCustomAlert("Error", "Failed to load support settings.", "error");
    } finally {
        setLoading(false);
      }
    };
    fetchSupportSettings();
  }, []);

  const handleCopy = (text: string) => {
    showCustomAlert("Copied!", `${text} has been copied to your clipboard.`, "success");
  };

  // Map state to the UI array dynamically
  const SUPPORT_OPTIONS = [
    { 
      id: '1', 
      title: 'Call Support', 
      sub: 'Talk to our support team', 
      value: supportData.phone, 
      icon: 'phone-call', 
      iconBg: '#FEF3C7', 
      iconColor: '#D97706' 
    },
    { 
      id: '2', 
      title: 'WhatsApp Support', 
      sub: 'Message us on WhatsApp', 
      value: supportData.whatsapp, 
      icon: 'message-circle', 
      iconBg: '#DCFCE7', 
      iconColor: '#16A34A' 
    },
    { 
      id: '3', 
      title: 'Email Support', 
      sub: 'Send us an email', 
      value: supportData.email, 
      icon: 'mail', 
      iconBg: '#FFEDD5', 
      iconColor: '#EA580C' 
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#EAB308" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* HERO IMAGE */}
        <MotiView 
          from={{ opacity: 0, scale: 0.8, translateY: -20 }} 
          animate={{ opacity: 1, scale: 1, translateY: 0 }} 
          transition={{ type: 'spring', damping: 14, delay: 100 }}
          style={styles.imageContainer}
        >
          <Image 
            source={{ uri: 'https://img.freepik.com/free-vector/customer-support-flat-illustration_23-2148889374.jpg' }} 
            style={styles.heroImage}
            resizeMode="contain"
          />
        </MotiView>

        {/* SUPPORT OPTIONS LIST */}
        <View style={styles.optionsContainer}>
          {SUPPORT_OPTIONS.map((option, index) => (
            <MotiView 
              key={option.id}
              from={{ opacity: 0, translateY: 30 }} 
              animate={{ opacity: 1, translateY: 0 }} 
              transition={{ type: 'spring', damping: 15, delay: 300 + (index * 150) }}
            >
              <View style={styles.optionCard}>
                <View style={styles.optionLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: option.iconBg }]}>
                    <Feather name={option.icon as any} size={22} color={option.iconColor} />
                  </View>
                  
                  <View style={styles.textContainer}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSub}>{option.sub}</Text>
                    <Text style={styles.optionValue}>{option.value}</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  activeOpacity={0.6} 
                  style={styles.copyButton}
                  onPress={() => handleCopy(option.value)}
                >
                  <Feather name="copy" size={20} color="#4B5563" />
                </TouchableOpacity>
              </View>
            </MotiView>
          ))}
        </View>

        {/* FOOTER TEXT */}
        <MotiText 
          from={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ type: 'timing', duration: 800, delay: 800 }}
          style={styles.footerText}
        >
          Our support team is available to help you with any questions or issues you might have. Feel free to reach out to us through any of the channels above.
        </MotiText>

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
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EAB308', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  scrollContent: { paddingBottom: 40 },
  imageContainer: { alignItems: 'center', marginTop: 20, marginBottom: 30, paddingHorizontal: 20 },
  heroImage: { width: '100%', height: 200 },
  optionsContainer: { paddingHorizontal: 24, marginBottom: 30 },
  optionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  textContainer: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 4 },
  optionSub: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  optionValue: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  copyButton: { padding: 8 },
  footerText: { textAlign: 'center', fontSize: 13, color: '#6B7280', lineHeight: 22, paddingHorizontal: 30, letterSpacing: 0.2 },
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