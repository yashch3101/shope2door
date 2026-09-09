import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { Coupon, getAvailableCoupons } from '../services/coupon.api';

export default function CouponsScreen() {
  const router = useRouter();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const showCustomAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    console.log(`${type.toUpperCase()} - ${title}: ${message}`);
  };

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAvailableCoupons();
      
      if (response.success && response.data && response.data.coupons) {
        // Sirf active coupons filter karo
        const activeOnly = response.data.coupons.filter((c) => c.isActive);
        setCoupons(activeOnly);
      }
    } catch (error) {
      console.log('Failed to fetch coupons:', error);
      showCustomAlert('Error', error instanceof Error ? error.message : 'Unable to load coupons.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const copyToClipboard = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Available Offers</Text>
        
        <View style={{ width: 40 }} />
      </View>

      {/* CONTENT */}
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#EAB308" />
          <Text style={styles.loadingText}>Finding best offers for you...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {coupons.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="ticket-percent-outline" size={60} color="#D1D5DB" />
              <Text style={styles.emptyTextTitle}>No Offers Available</Text>
              <Text style={styles.emptyTextSub}>Check back later for new coupons and discounts.</Text>
            </View>
          ) : (
            coupons.map((coupon, index) => {
              const isPercentage = coupon.type === 'PERCENTAGE';
              const discountDisplay = isPercentage ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`;
              const expiryDate = formatDate(coupon.expiresAt);

              return (
                <MotiView
                  key={coupon.id}
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'spring', delay: index * 100 }}
                  style={styles.couponCard}
                >
                  {/* Left Side: Discount Info */}
                  <View style={styles.discountArea}>
                    <Text style={styles.discountValue}>{discountDisplay}</Text>
                    {isPercentage && coupon.maxDiscount ? (
                      <Text style={styles.maxDiscount}>Up to ₹{coupon.maxDiscount}</Text>
                    ) : null}
                  </View>

                  <View style={styles.dashedDivider} />

                  {/* Right Side: Code & Details */}
                  <View style={styles.detailsArea}>
                    <Text style={styles.couponDesc} numberOfLines={2}>
                      {coupon.description || `Get ${discountDisplay} on orders above ₹${coupon.minOrderAmount}`}
                    </Text>
                    
                    {expiryDate && (
                      <Text style={styles.validityText}>Valid till {expiryDate}</Text>
                    )}

                    <View style={styles.codeRow}>
                      <View style={styles.codeBox}>
                        <Text style={styles.codeText}>{coupon.code}</Text>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.copyBtn}
                        onPress={() => copyToClipboard(coupon.code)}
                      >
                        <Text style={styles.copyBtnText}>
                          {copiedCode === coupon.code ? 'COPIED' : 'COPY'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </MotiView>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyTextTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyTextSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  couponCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  discountArea: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: 110,
  },
  discountValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#D97706',
    textAlign: 'center',
  },
  maxDiscount: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  dashedDivider: {
    width: 1,
    borderRightWidth: 2,
    borderRightColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  detailsArea: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  couponDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    lineHeight: 18,
  },
  validityText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
    fontWeight: '500',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  codeBox: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: 1,
  },
  copyBtn: {
    backgroundColor: '#EAB308',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyBtnText: {
    color: '#1F2937',
    fontSize: 12,
    fontWeight: '800',
  },
});