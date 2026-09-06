import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function OrderSuccessScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      <View style={styles.container}>
        {/* Animated Checkmark */}
        <MotiView
          from={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 90, delay: 200 }}
          style={styles.iconCircle}
        >
          <Ionicons name="checkmark" size={60} color="#FFF" />
        </MotiView>

        {/* Success Text */}
        <MotiView
          from={{ translateY: 20, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          transition={{ type: 'timing', duration: 500, delay: 500 }}
          style={styles.textContainer}
        >
          <Text style={styles.title}>Order Placed Successfully!</Text>
          <Text style={styles.subText}>
            Thank you for your purchase. Your order {orderId ? `#${orderId}` : ''} is currently being processed and will be delivered shortly.
          </Text>
        </MotiView>

        {/* Buttons */}
        <MotiView
          from={{ translateY: 20, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          transition={{ type: 'timing', duration: 500, delay: 800 }}
          style={styles.buttonContainer}
        >
          <TouchableOpacity 
            style={styles.trackButton} 
            activeOpacity={0.8}
            onPress={() => router.replace({ pathname: '/order-details', params: { orderId } })}
          >
            <Text style={styles.trackButtonText}>Track Order</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.homeButton} 
            activeOpacity={0.8}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </MotiView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15, marginBottom: 30 },
  textContainer: { alignItems: 'center', marginBottom: 50 },
  title: { fontSize: 24, fontWeight: '900', color: '#1F2937', marginBottom: 12, textAlign: 'center' },
  subText: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  buttonContainer: { width: '100%', gap: 16 },
  trackButton: { backgroundColor: '#EAB308', height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#EAB308', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 8 },
  trackButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  homeButton: { backgroundColor: '#F3F4F6', height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  homeButtonText: { color: '#4B5563', fontSize: 16, fontWeight: '700' },
});