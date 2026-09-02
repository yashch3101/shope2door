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

// --- TERMS DATA ---
const TERMS_DATA = [
  {
    id: '1',
    title: 'Product Accuracy & Shelf Life',
    points: [
      'We strive to ensure that all product images, descriptions, and prices are accurate',
      'Customers are responsible for checking the MRP and expiry date of FMCG products at the time of delivery',
      'Shope2door guarantees delivery of fresh and genuine stock'
    ]
  },
  {
    id: '2',
    title: 'Order Cancellation',
    points: [
      "Orders for FMCG items can be cancelled only after order confirmation and before the order status is marked as 'Dispatched'",
      'Perishable items such as milk, bread, fruits, and vegetables cannot be cancelled once dispatched'
    ]
  },
  {
    id: '3',
    title: 'Return & Refund Policy (FMCG)',
    points: [
      'Perishable items are non-returnable except when received damaged or incorrect',
      'If a damaged or wrong product is delivered, customers must raise a complaint within 24-48 hours of delivery through the app or customer support'
    ]
  }
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* 1. HEADER */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 2. MAIN HEADING & INTRO (Animated) */}
        <MotiView 
          from={{ opacity: 0, translateY: 20 }} 
          animate={{ opacity: 1, translateY: 0 }} 
          transition={{ type: 'spring', damping: 15, delay: 100 }}
          style={styles.introSection}
        >
          <Text style={styles.mainTitle}>Shope2door : Terms & Conditions</Text>
          <Text style={styles.introText}>
            By accessing or using the Shope2door mobile application, you agree to comply with and be bound by the following Terms & Conditions. Please read them carefully before placing an order.
          </Text>
        </MotiView>

        {/* 3. TERMS LIST (Staggered Animation) */}
        <View style={styles.termsContainer}>
          {TERMS_DATA.map((term, index) => (
            <MotiView 
              key={term.id}
              from={{ opacity: 0, translateY: 20 }} 
              animate={{ opacity: 1, translateY: 0 }} 
              transition={{ type: 'timing', duration: 400, delay: 300 + (index * 150) }}
              style={styles.termBlock}
            >
              {/* Section Header (Number + Title) */}
              <View style={styles.termHeader}>
                <View style={styles.numberBadge}>
                  <Text style={styles.numberText}>{term.id}</Text>
                </View>
                <Text style={styles.termTitle}>{term.title}</Text>
              </View>

              {/* Bullet Points */}
              <View style={styles.pointsContainer}>
                {term.points.map((point, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>·</Text>
                    <Text style={styles.bulletText}>{point}</Text>
                  </View>
                ))}
              </View>
            </MotiView>
          ))}
        </View>

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
  
  // Intro Section
  introSection: { marginBottom: 32 },
  mainTitle: { fontSize: 22, fontWeight: '900', color: '#EAB308', marginBottom: 16, lineHeight: 30 },
  introText: { fontSize: 15, color: '#4B5563', lineHeight: 24 },
  
  // Terms Sections
  termsContainer: { marginTop: 8 },
  termBlock: { marginBottom: 28 },
  
  // Term Header
  termHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  numberBadge: { width: 22, height: 22, backgroundColor: '#6B7280', borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  numberText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  termTitle: { fontSize: 18, fontWeight: '800', color: '#111827', flex: 1 },
  
  // Bullet Points
  pointsContainer: { paddingLeft: 6 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bulletDot: { fontSize: 20, color: '#4B5563', lineHeight: 22, marginRight: 8, marginTop: -2 },
  bulletText: { flex: 1, fontSize: 15, color: '#4B5563', lineHeight: 22 }
});