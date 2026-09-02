import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar,
  ScrollView,
  Image,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { MotiView, MotiText } from 'moti';
import { useRouter } from 'expo-router';

// --- SUPPORT DATA ---
const SUPPORT_OPTIONS = [
  { 
    id: '1', 
    title: 'Call Support', 
    sub: 'Talk to our support team', 
    value: '9759956021', 
    icon: 'phone-call', 
    iconBg: '#FEF3C7', // Yellowish
    iconColor: '#D97706' 
  },
  { 
    id: '2', 
    title: 'WhatsApp Support', 
    sub: 'Message us on WhatsApp', 
    value: '9759956021', 
    icon: 'message-circle', 
    iconBg: '#DCFCE7', // Greenish
    iconColor: '#16A34A' 
  },
  { 
    id: '3', 
    title: 'Email Support', 
    sub: 'Send us an email', 
    value: 'Shopdoor07@gmail.com', 
    icon: 'mail', 
    iconBg: '#FFEDD5', // Orangeish
    iconColor: '#EA580C' 
  },
];

export default function HelpScreen() {
  const router = useRouter();

  const handleCopy = (text: string) => {
    // Real app mein yahan expo-clipboard use hota hai
    Alert.alert("Copied!", `${text} has been copied to your clipboard.`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* 1. HEADER */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 2. HERO IMAGE (Bounce Animation) */}
        <MotiView 
          from={{ opacity: 0, scale: 0.8, translateY: -20 }} 
          animate={{ opacity: 1, scale: 1, translateY: 0 }} 
          transition={{ type: 'spring', damping: 14, delay: 100 }}
          style={styles.imageContainer}
        >
          {/* Main ek generic placeholder illustration use kar raha hu dummy UI ke liye */}
          <Image 
            source={{ uri: 'https://img.freepik.com/free-vector/customer-support-flat-illustration_23-2148889374.jpg' }} 
            style={styles.heroImage}
            resizeMode="contain"
          />
        </MotiView>

        {/* 3. SUPPORT OPTIONS LIST (Staggered Animation) */}
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
                  {/* Icon Circle */}
                  <View style={[styles.iconCircle, { backgroundColor: option.iconBg }]}>
                    <Feather name={option.icon as any} size={22} color={option.iconColor} />
                  </View>
                  
                  {/* Text Info */}
                  <View style={styles.textContainer}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSub}>{option.sub}</Text>
                    <Text style={styles.optionValue}>{option.value}</Text>
                  </View>
                </View>

                {/* Copy Button */}
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

        {/* 4. FOOTER TEXT (Fade In) */}
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
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EAB308', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  
  scrollContent: { paddingBottom: 40 },
  
  // Image Section
  imageContainer: { alignItems: 'center', marginTop: 20, marginBottom: 30, paddingHorizontal: 20 },
  heroImage: { width: '100%', height: 200 },
  
  // List Section
  optionsContainer: { paddingHorizontal: 24, marginBottom: 30 },
  optionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  textContainer: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 4 },
  optionSub: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  optionValue: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  
  copyButton: { padding: 8 },

  // Footer Text
  footerText: { textAlign: 'center', fontSize: 13, color: '#6B7280', lineHeight: 22, paddingHorizontal: 30, letterSpacing: 0.2 },
});