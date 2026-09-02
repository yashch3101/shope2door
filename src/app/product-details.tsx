import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Alert,
  StatusBar,
  Dimensions,
  ScrollView,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useRouter, useLocalSearchParams } from 'expo-router';

import {
  getProductById,
  getSimilarProducts,
} from '../services/product.api';

import { addToCart } from '../services/cart.api';

import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from '../services/wishlist.api';

import type {
  Product,
} from '../services/product.api';

const { width, height } = Dimensions.get('window');


export default function ProductDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const productId = params.id
    ? String(params.id)
    : '';

  const [product, setProduct] =
    useState<Product | null>(null);

  const [similarProducts, setSimilarProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [activeIndex, setActiveIndex] =
    useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadProduct() {
      if (!productId) {
        setError('Product ID is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [productResponse, similarResponse] =
          await Promise.all([
            getProductById(productId),
            getSimilarProducts(productId, 10),
          ]);

        if (!mounted) return;

        setProduct(productResponse.data);
        setSimilarProducts(similarResponse.data);
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load product',
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      mounted = false;
    };
  }, [productId]);

  useEffect(() => {
    const loadWishlist = async () => {
      if (!productId) {
        return;
      }

      try {
        const response = await getWishlist();

        const states: Record<string, boolean> = {};

        response.data.items.forEach(item => {
          states[item.productId] = true;
        });

        setWishlistState(states);
        setIsWishlisted(states[productId] === true);
      } catch (error) {
        console.log(
          'Failed to load wishlist:',
          error,
        );

        setWishlistState({});
        setIsWishlisted(false);
      }
    };

    loadWishlist();
  }, [productId]);

  const productPrice =
    product
      ? Number(product.price)
      : 0;

  const productMrp =
    product
      ? Number(product.mrp)
      : 0;

  const discountPercentage =
    productMrp > 0 && productPrice < productMrp
      ? Math.round(
          ((productMrp - productPrice) /
            productMrp) *
            100,
        )
      : 0;

  const productDiscount =
    `${discountPercentage}% OFF`;

  const [addingToCart, setAddingToCart] = useState(false);

  const [isWishlisted, setIsWishlisted] =
    useState(false);

  const [wishlistLoading, setWishlistLoading] =
    useState<Record<string, boolean>>({});

  const [wishlistState, setWishlistState] =
    useState<Record<string, boolean>>({});

  const handleAddToCart = async () => {
    if (!product) {
      return;
    }

    if (product.stock <= 0) {
      Alert.alert(
        'Out of Stock',
        'This product is currently unavailable.',
      );
      return;
    }

    if (addingToCart) {
      return;
    }

    try {
      setAddingToCart(true);

      await addToCart(product.id, 1);

      Alert.alert(
        'Added to Cart',
        `${product.name} has been added to your cart.`,
      );
    } catch (error) {
      console.error(
        'Failed to add product to cart:',
        error,
      );

      Alert.alert(
        'Unable to Add',
        error instanceof Error
          ? error.message
          : 'Unable to add product to cart.',
      );
    } finally {
      setAddingToCart(false);
    }
  };

  const handleWishlistToggle = async () => {
  if (!product || wishlistLoading[product.id]) {
    return;
  }

  const productId = product.id;
  const currentlyInWishlist = isWishlisted;

  try {
    setWishlistLoading(prev => ({
      ...prev,
      [productId]: true,
    }));

    if (currentlyInWishlist) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(productId);
    }

    // Re-fetch wishlist from backend so UI always
    // reflects the actual server state.
    const response = await getWishlist();

    const states: Record<string, boolean> = {};

    response.data.items.forEach(item => {
      states[item.productId] = true;
    });

    setWishlistState(states);
    setIsWishlisted(states[productId] === true);
  } catch (error) {
    console.error(
      'Wishlist update failed:',
      error,
    );

    Alert.alert(
      'Wishlist',
      error instanceof Error
        ? error.message
        : 'Unable to update wishlist.',
    );
  } finally {
    setWishlistLoading(prev => ({
      ...prev,
      [productId]: false,
    }));
  }
};

  const handleWishlistToggleForProduct = async (
  productId: string,
) => {
  if (wishlistLoading[productId]) {
    return;
  }

  const currentlyInWishlist =
    wishlistState[productId] === true;

  try {
    setWishlistLoading(prev => ({
      ...prev,
      [productId]: true,
    }));

    if (currentlyInWishlist) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(productId);
    }

    // Re-sync wishlist from backend
    const response = await getWishlist();

    const states: Record<string, boolean> = {};

    response.data.items.forEach(item => {
      states[item.productId] = true;
    });

    setWishlistState(states);

    // Keep main product heart synchronized too
    if (product?.id === productId) {
      setIsWishlisted(states[productId] === true);
    }
  } catch (error) {
    console.error(
      'Wishlist update failed:',
      error,
    );

    Alert.alert(
      'Wishlist',
      error instanceof Error
        ? error.message
        : 'Unable to update wishlist.',
    );
  } finally {
    setWishlistLoading(prev => ({
      ...prev,
      [productId]: false,
    }));
  }
};
      

  // Scroll Tracker Setup
  const onViewRef = useRef((info: any) => {
    if (info.viewableItems.length > 0) {
      setActiveIndex(info.viewableItems[0].index || 0);
    }
  });
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

    if (loading) {
      return (
        <View style={styles.centerState}>
          <Text style={styles.stateText}>
            Loading product...
          </Text>
        </View>
      );
    }

    if (error || !product) {
      return (
        <View style={styles.centerState}>
          <Text style={styles.stateText}>
            {error || 'Product not found'}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* 1. FLOATING HEADER BUTTONS */}
      <View style={styles.floatingHeader}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.circleBtn}
        onPress={() => router.back()}
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color="#FFF"
        />
      </TouchableOpacity>

      <View style={styles.headerRightActions}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.circleBtn}
        >
          <Feather
            name="search"
            size={20}
            color="#FFF"
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.circleBtn}
          onPress={handleWishlistToggle}
          disabled={!!product && wishlistLoading[product.id] === true}
        >
          <Ionicons
            name={
              isWishlisted
                ? 'heart'
                : 'heart-outline'
            }
            size={21}
            color={
              isWishlisted
                ? '#EF4444'
                : '#FFF'
            }
          />
        </TouchableOpacity>
      </View>
    </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 2. PRODUCT IMAGE CAROUSEL (Scrollable Swipe Logic) */}
        <MotiView 
          from={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ type: 'spring', damping: 15 }}
          style={styles.imageSection}
        >
          {/* Scrollable FlatList */}
          <FlatList
            data={
              product.images.length > 0
                ? product.images
                : ['']
            }
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) =>
              item || `image-${index}`
            }
            onViewableItemsChanged={onViewRef.current}
            viewabilityConfig={viewConfigRef.current}
            renderItem={({ item, index }) => (
            <View style={styles.imagePlaceholder}>
              {item ? (
                <Image
                  source={{ uri: item }}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              ) : (
                <Ionicons
                  name="image-outline"
                  size={100}
                  color="#D1D5DB"
                />
              )}

              {!item && (
                <Text
                  style={{
                    color: '#9CA3AF',
                    marginTop: 10,
                  }}
                >
                  Product Image
                </Text>
              )}
            </View>
          )}
          />
          
          {/* Dynamic Carousel Dots */}
          <View style={styles.dotsContainer}>
            {(product.images.length > 0
              ? product.images
              : ['']
            ).map((_, index) => (
              <View key={index} style={[styles.dot, activeIndex === index && styles.activeDot]} />
            ))}
          </View>
        </MotiView>

        {/* 3. PRODUCT INFO DETAILS (Slide Up Animation) */}
        <MotiView 
          from={{ opacity: 0, translateY: 40 }} 
          animate={{ opacity: 1, translateY: 0 }} 
          transition={{ type: 'timing', duration: 400, delay: 100 }}
          style={styles.detailsBox}
        >
          <View style={styles.timeBadge}>
            <MaterialIcons name="timer" size={14} color="#DC2626" />
            <Text style={styles.timeText}>20-30M</Text>
          </View>

          <Text style={styles.productTitle}>
            {product.name}
          </Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>
              ₹{productPrice.toFixed(2)}
            </Text>
            {discountPercentage > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountTextGreen}>
                  {productDiscount}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.mrpText}>
            MRP{' '}
            <Text style={styles.strikethrough}>
              ₹{productMrp.toFixed(2)}
            </Text>{' '}
            (Incl. of all taxes)
          </Text>

          <Text style={styles.sectionHeading}>Select Unit</Text>
          <View style={styles.unitBox}>
            <View style={styles.unitBoxTopCurve}>

            <Text style={styles.unitDiscountText}>
                {productDiscount}
              </Text>

              <Text style={styles.unitWeight}>
                {product.weight || product.unit || '1 unit'}
              </Text>

              <View style={styles.unitPriceRow}>
                <Text style={styles.unitCurrentPrice}>
                  ₹{productPrice.toFixed(2)}
                </Text>

                {productMrp > productPrice && (
                  <Text style={styles.unitOldPrice}>
                    ₹{productMrp.toFixed(2)}
                  </Text>
                )}
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>View product details</Text>
            <Ionicons name="chevron-down" size={18} color="#4B5563" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.exploreBanner}>
            <View style={styles.exploreLeft}>
              <Ionicons name="receipt-outline" size={20} color="#9CA3AF" style={{marginRight: 10}} />
              <Text style={styles.exploreText}>Explore all's Item</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color="#4B5563" />
          </TouchableOpacity>

          <Text style={[styles.sectionHeading, { marginTop: 20 }]}>Coupons & Offers</Text>
          
          <Text style={[styles.sectionHeading, { marginTop: 30 }]}>Similar products</Text>
        </MotiView>

        {/* 4. SIMILAR PRODUCTS GRID */}
        <View style={styles.similarGrid}>
          {similarProducts.map((item, index) => {
            const price = Number(item.price);
            const mrp = Number(item.mrp);

            const discount =
              mrp > 0 && price < mrp
                ? Math.round(
                    ((mrp - price) / mrp) * 100,
                  )
                : 0;

            return (

            <MotiView 
              key={item.id}
              from={{ opacity: 0, scale: 0.8, translateY: 30 }} 
              animate={{ opacity: 1, scale: 1, translateY: 0 }} 
              transition={{ type: 'spring', delay: 300 + (index * 100), damping: 14 }}
              style={styles.productCardWrapper}
            >
              <View style={styles.productCard}>
                <View style={styles.cardTop}>
                  <View style={styles.discountBadgeGreen}><Text style={styles.discountBadgeText}>{discount}% OFF</Text></View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    disabled={wishlistLoading[item.id]}
                    onPress={() =>
                      handleWishlistToggleForProduct(
                        item.id,
                      )
                    }
                    style={styles.smallHeartButton}
                  >
                    <Feather
                      name="heart"
                      size={18}
                      color={
                        wishlistState[item.id]
                          ? '#EF4444'
                          : '#9CA3AF'
                      }
                      fill={
                        wishlistState[item.id]
                          ? '#EF4444'
                          : 'none'
                      }
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: '/product-details',
                      params: {
                        id: item.id,
                      },
                    })
                  }
                >
                  <View style={styles.cardImagePlaceholder}>
                    {item.images?.[0] ? (
                      <Image
                        source={{ uri: item.images[0] }}
                        style={styles.similarProductImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Ionicons
                        name="image-outline"
                        size={30}
                        color="#D1D5DB"
                      />
                    )}
                  </View>
                </TouchableOpacity>
                <View style={styles.infoRowGrid}>
                  <Text style={styles.weightText}>{item.weight || item.unit || '1 unit'}</Text>
                  <View style={styles.timeRowGrid}>
                    <MaterialIcons name="timer" size={10} color="#DC2626" />
                    <Text style={styles.timeTextGrid}>20-30M</Text>
                  </View>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: '/product-details',
                      params: {
                        id: item.id,
                      },
                    })
                  }
                >
                  <Text style={styles.productNameGrid} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.productPriceGrid}>₹{price.toFixed(2)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addBtnGrid}
                  activeOpacity={0.8}
                  onPress={async () => {
                    if (item.stock <= 0) {
                      Alert.alert(
                        'Out of Stock',
                        'This product is currently unavailable.',
                      );
                      return;
                    }

                    try {
                      await addToCart(item.id, 1);

                      Alert.alert(
                        'Added to Cart',
                        `${item.name} has been added to your cart.`,
                      );
                    } catch (error) {
                      console.error(
                        'Failed to add similar product to cart:',
                        error,
                      );

                      Alert.alert(
                        'Unable to Add',
                        error instanceof Error
                          ? error.message
                          : 'Unable to add product to cart.',
                      );
                    }
                  }}
                >
                  <Text style={styles.addBtnTextGrid}>Add to Cart</Text>
                </TouchableOpacity>
              </View>
            </MotiView>
          );
        })}
        </View>

        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 800 }}>
          <TouchableOpacity style={styles.seeAllBtn}>
            <Text style={styles.seeAllBtnText}>See all Products</Text>
            <Ionicons name="chevron-forward-outline" size={16} color="#1F2937" />
          </TouchableOpacity>
        </MotiView>

      </ScrollView>

      {/* 5. FIXED BOTTOM ACTION BAR */}
      <MotiView 
        from={{ translateY: 100 }} 
        animate={{ translateY: 0 }} 
        transition={{ type: 'spring', delay: 500, damping: 20 }}
        style={styles.bottomActionBar}
      >
        <TouchableOpacity
          style={[
            styles.addToCartBtn,
            (addingToCart || product.stock <= 0) && {
              opacity: 0.6,
            },
          ]}
          activeOpacity={0.8}
          disabled={addingToCart || product.stock <= 0}
          onPress={handleAddToCart}
        >
          <Text style={styles.addToCartText}>
            {addingToCart
              ? 'Adding...'
              : product.stock <= 0
                ? 'Out of Stock'
                : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.buyNowBtn} 
          activeOpacity={0.8}
          onPress={async () => {
            if (!product) {
              return;
            }

            if (product.stock <= 0) {
              Alert.alert(
                'Out of Stock',
                'This product is currently unavailable.',
              );
              return;
            }

            try {
              setAddingToCart(true);

              await addToCart(product.id, 1);

              router.push('/cart');
            } catch (error) {
              console.error(
                'Buy Now failed:',
                error,
              );

              Alert.alert(
                'Unable to Continue',
                error instanceof Error
                  ? error.message
                  : 'Unable to add product to cart.',
              );
            } finally {
              setAddingToCart(false);
            }
          }}
        >
          <Text style={styles.buyNowText}>Buy Now</Text>
        </TouchableOpacity>
      </MotiView>

    </View>
  );
}

const styles = StyleSheet.create({
  floatingHeader: { position: 'absolute', top: 40, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EAB308', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 5 },
  
  scrollContent: { paddingBottom: 120 },
  
  imageSection: { width: '100%', height: height * 0.45, backgroundColor: '#F9FAFB', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' },

  imagePlaceholder: { width: width, height: height * 0.45, justifyContent: 'center', alignItems: 'center' },
  dotsContainer: { flexDirection: 'row', alignItems: 'center', position: 'absolute', bottom: 20, width: '100%', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB', marginHorizontal: 4 },
  activeDot: { backgroundColor: '#EAB308', width: 20 },

  detailsBox: { paddingHorizontal: 16, paddingTop: 20 },
  timeBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  timeText: { fontSize: 12, color: '#1F2937', fontWeight: '700', marginLeft: 4 },
  productTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937', marginBottom: 12, lineHeight: 28 },
  
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  currentPrice: { fontSize: 24, fontWeight: '900', color: '#111827', marginRight: 12 },
  discountBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  discountTextGreen: { color: '#16A34A', fontSize: 12, fontWeight: '800' },
  
  mrpText: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginBottom: 20 },
  strikethrough: { textDecorationLine: 'line-through' },
  
  sectionHeading: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 12 },
  
  unitBox: { width: 120, height: 80, borderRadius: 12, borderWidth: 1.5, borderColor: '#4ADE80', backgroundColor: '#FEF9C3', overflow: 'hidden', padding: 8, justifyContent: 'flex-end', marginBottom: 20 },
  unitBoxTopCurve: { position: 'absolute', top: 0, left: 0, backgroundColor: '#4ADE80', paddingHorizontal: 8, paddingVertical: 2, borderBottomRightRadius: 12 },
  unitDiscountText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  unitWeight: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  unitPriceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  unitCurrentPrice: { fontSize: 14, fontWeight: '800', color: '#111827', marginRight: 6 },
  unitOldPrice: { fontSize: 12, color: '#9CA3AF', textDecorationLine: 'line-through' },

  infoBanner: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  infoBannerText: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginRight: 8 },
  
  exploreBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F3F4F6', marginTop: 10 },
  exploreLeft: { flexDirection: 'row', alignItems: 'center' },
  exploreText: { fontSize: 15, fontWeight: '700', color: '#1F2937' },

  similarGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  productCardWrapper: { width: '33.33%', padding: 6 },
  productCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  discountBadgeGreen: { backgroundColor: '#2E7D32', paddingVertical: 2, paddingHorizontal: 4, borderRadius: 4 },
  discountBadgeText: { color: '#FFF', fontSize: 8, fontWeight: 'bold' },
  cardImagePlaceholder: { height: 60, backgroundColor: '#F9FAFB', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  infoRowGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  weightText: { fontSize: 9, color: '#6B7280', backgroundColor: '#F3F4F6', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  timeRowGrid: { flexDirection: 'row', alignItems: 'center' },
  timeTextGrid: { fontSize: 8, color: '#DC2626', fontWeight: '700', marginLeft: 2 },
  productNameGrid: { fontSize: 11, fontWeight: '700', color: '#1F2937', height: 30, lineHeight: 14, marginBottom: 4 },
  productPriceGrid: { fontSize: 13, fontWeight: '800', color: '#111827', marginBottom: 8 },
  addBtnGrid: { backgroundColor: '#65A30D', height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  addBtnTextGrid: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  seeAllBtn: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, marginTop: 16, marginBottom: 20, borderWidth: 1, borderColor: '#EAB308' },
  seeAllBtnText: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginRight: 8 },

  bottomActionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 15 },
  addToCartBtn: { flex: 1, backgroundColor: '#EAB308', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  addToCartText: { color: '#1F2937', fontSize: 16, fontWeight: '800' },
  buyNowBtn: { flex: 1, backgroundColor: '#FFF', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 8, borderWidth: 2, borderColor: '#EAB308' },
  buyNowText: { color: '#EAB308', fontSize: 16, fontWeight: '800' },

  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
  },

  stateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 16,
    backgroundColor: '#EAB308',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },

  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },

  productImage: {
    width: '90%',
    height: '90%',
  },
  
  similarProductImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },

  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  smallHeartButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});