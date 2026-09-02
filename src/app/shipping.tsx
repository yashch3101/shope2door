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

// --- RETURN POLICY DATA ---
const RETURN_DATA = [
  {
    id: '1',
    title: 'Return Window',
    points: [
      'Perishable Items (Milk, Paneer, Bread, etc.): These items must be checked and returned only at the time of delivery. No returns will be accepted after delivery is completed.',
      'Non-Perishable Items (Snacks, Spices, Shampoo, etc.): Return requests can be raised within 48 hours of delivery, provided the seal remains intact.'
    ]
  },
  {
    id: '2',
    title: 'Conditions for Return',
    text: 'Your product will be eligible for return only if:',
    points: [
      'The product was received in a damaged condition',
      'The product is expired',
      'A wrong item was delivered',
      'The original packaging and price tag are intact'
    ]
  },
  {
    id: '3',
    title: 'Proof for Return',
    text: 'To ensure a smooth return or refund process, customers are requested to inspect products at the time of delivery. If an issue is found, proof such as photographs may be required.'
  },
  {
    id: '4',
    title: 'Refund Process',
    text: 'After verification of the returned product, the refund will be credited to the original payment method (Bank / UPI) within 5–7 working days. For Cash on Delivery (COD) orders, customers may need to provide bank account details.'
  },
  {
    id: '5',
    title: 'Non-Returnable Items',
    text: 'Certain items are not eligible for return, including:',
    points: [
      'Used products',
      'Opened or partially used packets',
      'Products purchased under special promotional or clearance offers'
    ]
  }
];

export default function ShippingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* 1. HEADER */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Return Policy</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 2. MAIN HEADING & INTRO (Animated) */}
        <MotiView 
          from={{ opacity: 0, translateY: 20 }} 
          animate={{ opacity: 1, translateY: 0 }} 
          transition={{ type: 'spring', damping: 15, delay: 100 }}
          style={styles.introSection}
        >
          <Text style={styles.mainTitle}>Shope2door : Return & Refund Policy</Text>
          <Text style={styles.introText}>
            At Shope2door, customer satisfaction is our top priority. This policy explains the conditions under which products can be returned and how refunds are processed.
          </Text>
        </MotiView>

        {/* 3. POLICY SECTIONS (Staggered Animation) */}
        <View style={styles.sectionsContainer}>
          {RETURN_DATA.map((section, index) => (
            <MotiView 
              key={section.id}
              from={{ opacity: 0, translateY: 20 }} 
              animate={{ opacity: 1, translateY: 0 }} 
              transition={{ type: 'timing', duration: 400, delay: 300 + (index * 150) }}
              style={styles.sectionBlock}
            >
              {/* Section Header (Number + Title) */}
              <View style={styles.sectionHeader}>
                <View style={styles.numberBadge}>
                  <Text style={styles.numberText}>{section.id}</Text>
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>

              {/* Intro Text for Section (if any) */}
              {section.text && (
                <Text style={styles.sectionIntroText}>{section.text}</Text>
              )}

              {/* Bullet Points (if any) */}
              {section.points && (
                <View style={styles.pointsContainer}>
                  {section.points.map((point, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>·</Text>
                      <Text style={styles.bulletText}>{point}</Text>
                    </View>
                  ))}
                </View>
              )}
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
  
  // Policy Sections
  sectionsContainer: { marginTop: 8 },
  sectionBlock: { marginBottom: 28 },
  
  // Section Header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  numberBadge: { width: 22, height: 22, backgroundColor: '#6B7280', borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  numberText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', flex: 1 },
  
  // Section Content
  sectionIntroText: { fontSize: 15, color: '#4B5563', lineHeight: 24, marginBottom: 8 },
  
  // Bullet Points
  pointsContainer: { paddingLeft: 4, marginTop: 4 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bulletDot: { fontSize: 20, color: '#4B5563', lineHeight: 22, marginRight: 8, marginTop: -2 },
  bulletText: { flex: 1, fontSize: 15, color: '#4B5563', lineHeight: 22 }
});