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
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { MotiView, MotiText } from 'moti';
import { useRouter } from 'expo-router';
import { getAppSettings } from '../services/settings.api';

export default function HelpScreen() {
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
      } finally {
        setLoading(false);
      }
    };
    fetchSupportSettings();
  }, []);

  const handleCopy = (text: string) => {
    Alert.alert("Copied!", `${text} has been copied to your clipboard.`);
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
});