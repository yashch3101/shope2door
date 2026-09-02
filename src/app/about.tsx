import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar,
  ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* 1. HEADER */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Us</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 2. MAIN HEADING (Animated) */}
        <MotiView 
          from={{ opacity: 0, translateY: 20 }} 
          animate={{ opacity: 1, translateY: 0 }} 
          transition={{ type: 'spring', damping: 15, delay: 100 }}
        >
          <Text style={styles.mainTitle}>Welcome to Shope2door</Text>
          <Text style={styles.subtitle}>Your trusted partner for everyday essentials.</Text>
        </MotiView>

        {/* 3. FIRST PARAGRAPH (Staggered Animation) */}
        <MotiView 
          from={{ opacity: 0, translateY: 20 }} 
          animate={{ opacity: 1, translateY: 0 }} 
          transition={{ type: 'timing', duration: 500, delay: 300 }}
        >
          <Text style={styles.paragraph}>
            We believe that the foundation of a healthy and happy home lies in high-quality FMCG products. That is why Shope2door's mission is to deliver the freshest and most authentic groceries, household essentials, and personal care products right to your doorstep.
          </Text>
        </MotiView>

        {/* 4. SECOND PARAGRAPH (Staggered Animation) */}
        <MotiView 
          from={{ opacity: 0, translateY: 20 }} 
          animate={{ opacity: 1, translateY: 0 }} 
          transition={{ type: 'timing', duration: 500, delay: 500 }}
        >
          <Text style={styles.paragraph}>
            We don't just sell products; we build a relationship based on quality and trust. Our constant effort is to provide you with top brands at the right price, coupled with fast delivery, ensuring your shopping experience is easy and rewarding.
          </Text>
        </MotiView>

        {/* 5. TAGLINE (Bounce Animation) */}
        <MotiView 
          from={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ type: 'spring', damping: 12, delay: 800 }}
          style={styles.taglineContainer}
        >
          <Text style={styles.tagline}>
            Your choice, our identity — <Text style={styles.taglineBold}>Shope2door</Text>
          </Text>
        </MotiView>

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
  
  scrollContent: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 40 },
  
  // Typography
  mainTitle: { fontSize: 24, fontWeight: '900', color: '#EAB308', marginBottom: 16 },
  subtitle: { fontSize: 16, color: '#4B5563', marginBottom: 24, lineHeight: 24 },
  
  paragraph: { fontSize: 15, color: '#4B5563', lineHeight: 26, marginBottom: 20, textAlign: 'justify' },
  
  taglineContainer: { marginTop: 30, alignItems: 'center' },
  tagline: { fontSize: 16, color: '#1F2937' },
  taglineBold: { fontWeight: '800' }
});