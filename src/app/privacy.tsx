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

// --- PRIVACY POLICY DATA ---
const PRIVACY_DATA = [
  {
    id: '1',
    title: 'Introduction',
    text: 'Shope2door is committed to protecting your personal information and maintaining transparency in how your data is collected and used.'
  },
  {
    id: '2',
    title: 'Information We Collect',
    text: 'We collect the following information:',
    points: [
      'Personal Data: Name, delivery address, email address, and phone number',
      'Transaction Data: Payment details (we do not store card details; payments are handled securely by gateways)',
      'Technical Data: IP address and browsing behavior collected through cookies'
    ]
  },
  {
    id: '3',
    title: 'How We Use Your Information',
    text: 'Your information is used only for:',
    points: [
      'Processing orders and ensuring successful delivery',
      'Providing updates, offers, and information on new FMCG products',
      'Offering customer support and resolving complaints'
    ]
  },
  {
    id: '4',
    title: 'Data Sharing & Third Parties',
    text: 'We do not sell your personal data. It may be shared only with:',
    points: [
      'Logistics Partners: For order delivery',
      'Payment Gateways: For secure payment processing',
      'Legal Authorities: When required by law or government regulations'
    ]
  },
  {
    id: '5',
    title: 'Your Rights',
    text: 'As per the Digital Personal Data Protection Act, 2023, you have the right to:',
    points: [
      'Correct inaccurate personal information',
      'Request deletion of your account or data',
      'Withdraw consent for marketing communications at any time'
    ]
  },
  {
    id: '6',
    title: 'Contact Us',
    text: 'If you have any questions or concerns, please contact our Grievance Officer:',
    contact: {
      email: 'Kulbeer.saini.56@gmail.com',
      address: 'Shope2door — Amardeep Colony, Saharanpur Road, Chhutmalpur.'
    }
  }
];

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* 1. HEADER */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 2. MAIN HEADING & INTRO (Animated) */}
        <MotiView 
          from={{ opacity: 0, translateY: 20 }} 
          animate={{ opacity: 1, translateY: 0 }} 
          transition={{ type: 'spring', damping: 15, delay: 100 }}
          style={styles.introSection}
        >
          <Text style={styles.mainTitle}>Shope2door : Privacy Policy</Text>
          <Text style={styles.introText}>
            Welcome to Shope2door. We deeply respect your privacy. This policy explains how we collect and use your personal data such as your name, address, and phone number.
          </Text>
        </MotiView>

        {/* 3. PRIVACY SECTIONS (Staggered Animation) */}
        <View style={styles.sectionsContainer}>
          {PRIVACY_DATA.map((section, index) => (
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

              {/* Intro Text for Section */}
              {section.text && (
                <Text style={styles.sectionIntroText}>{section.text}</Text>
              )}

              {/* Bullet Points */}
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

              {/* Contact Info (Only for Section 6) */}
              {section.contact && (
                <View style={styles.contactContainer}>
                  <View style={styles.contactRow}>
                    <Ionicons name="mail" size={16} color="#9CA3AF" style={styles.contactIcon} />
                    <Text style={styles.contactText}>
                      <Text style={styles.contactLabel}>Email: </Text>
                      {section.contact.email}
                    </Text>
                  </View>
                  <View style={[styles.contactRow, { alignItems: 'flex-start' }]}>
                    <Ionicons name="location" size={16} color="#EF4444" style={[styles.contactIcon, { marginTop: 4 }]} />
                    <Text style={[styles.contactText, { flex: 1 }]}>
                      <Text style={styles.contactLabel}>Address: </Text>
                      {section.contact.address}
                    </Text>
                  </View>
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
  
  // Privacy Sections
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
  bulletText: { flex: 1, fontSize: 15, color: '#4B5563', lineHeight: 22 },

  // Contact Info
  contactContainer: { marginTop: 12, paddingLeft: 4 },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  contactIcon: { marginRight: 8 },
  contactText: { fontSize: 15, color: '#4B5563', lineHeight: 22 },
  contactLabel: { fontWeight: '700', color: '#4B5563' }
});