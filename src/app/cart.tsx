import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Ionicons,
  Feather,
} from '@expo/vector-icons';

import {
  MotiView,
  AnimatePresence,
} from 'moti';

import { useRouter } from 'expo-router';

import {
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from '../services/cart.api';

import type {
  CartItem,
  CartSummary,
} from '../services/cart.api';

import { BlurView } from 'expo-blur';

import { getAppSettings, AppSettings } from '../services/settings.api';

import { getAccessToken } from '../services/auth.storage';

const { width } = Dimensions.get('window');

export default function CartScreen() {
  const router = useRouter();

  const insets = useSafeAreaInsets();

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

  // VPS ka live ngrok domain (api/v1 ke bina)
  const IMAGE_BASE_URL = 'http://40.40.1.142:3000/api/v1';

  const getCartImageUrl = (imagePath?: string) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    return `${IMAGE_BASE_URL}/${cleanPath}`;
  };

  // =====================================================
  // CART STATE
  // =====================================================

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary>({
    totalItems: 0,
    subtotal: 0,
    totalMrp: 0,
    totalSavings: 0,
  });

  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  // =====================================================
  // LOADING STATE
  // =====================================================

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [updatingProductId, setUpdatingProductId] =
    useState<string | null>(null);

  const [removingProductId, setRemovingProductId] =
    useState<string | null>(null);

  const [clearing, setClearing] = useState(false);

  // =====================================================
  // LOAD CART
  // =====================================================

  const loadCart = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const settingsRes = await getAppSettings();
        if (settingsRes.success && settingsRes.data) {
          setAppSettings(settingsRes.data);
        }

        const token = await getAccessToken();

        if (!token) {
          setCartItems([]);
          setSummary({
            totalItems: 0,
            subtotal: 0,
            totalMrp: 0,
            totalSavings: 0,
          });
          return;
        }

        const response = await getCart();
        console.log('CART API FULL RESPONSE:', response);

        if (response.success && response.data) {
          setCartItems(response.data.items);
          setSummary(response.data.summary);
        } else {
          setCartItems([]);
        }
      } catch (error) {
        console.error(
          'Failed to load cart:',
          error,
        );

        showCustomAlert('Unable to load cart', error instanceof Error ? error.message : 'Something went wrong. Please try again.', 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCart(false);
  };

  // =====================================================
  // UPDATE QUANTITY
  // =====================================================

  const handleUpdateQuantity = async (
    productId: string,
    quantity: number,
  ) => {
    if (quantity < 1) {
      return;
    }

    const item = cartItems.find(
      (cartItem) =>
        cartItem.productId === productId,
    );

    if (!item) {
      return;
    }

    if (quantity > item.stock) {
      showCustomAlert('Stock limit reached', `Only ${item.stock} units are available.`, 'warning');

      return;
    }

    try {
      setUpdatingProductId(productId);

      const response =
        await updateCartItem(
          productId,
          quantity,
        );

      if (
        response.success &&
        response.data
      ) {
        setCartItems(
          response.data.items,
        );

        setSummary(
          response.data.summary,
        );
      }
    } catch (error) {
      console.error(
        'Failed to update cart item:',
        error,
      );

      showCustomAlert('Unable to update cart', error instanceof Error ? error.message : 'Something went wrong. Please try again.', 'error');
    } finally {
      setUpdatingProductId(null);
    }
  };

  // =====================================================
  // INCREASE
  // =====================================================

  const handleIncrease = (
    item: CartItem,
  ) => {
    handleUpdateQuantity(
      item.productId,
      item.quantity + 1,
    );
  };

  // =====================================================
  // DECREASE
  // =====================================================

  const handleDecrease = (
    item: CartItem,
  ) => {
    if (item.quantity <= 1) {
      return;
    }

    handleUpdateQuantity(
      item.productId,
      item.quantity - 1,
    );
  };

  // =====================================================
  // REMOVE ITEM
  // =====================================================

  const handleRemove = async (
    productId: string,
  ) => {
    try {
      setRemovingProductId(productId);

      const response =
        await removeCartItem(
          productId,
        );

      if (
        response.success &&
        response.data
      ) {
        setCartItems(
          response.data.items,
        );

        setSummary(
          response.data.summary,
        );
      }
    } catch (error) {
      console.error(
        'Failed to remove cart item:',
        error,
      );

      showCustomAlert('Unable to remove item', error instanceof Error ? error.message : 'Something went wrong. Please try again.', 'error');
    } finally {
      setRemovingProductId(null);
    }
  };

  // =====================================================
  // CLEAR CART
  // =====================================================

  const handleClearCart = async () => {
    if (cartItems.length === 0 || clearing) {
      return;
    }

    try {
      setClearing(true);
      await clearCart();

      setCartItems([]);
      setSummary({
        totalItems: 0,
        subtotal: 0,
        totalMrp: 0,
        totalSavings: 0,
      });

      showCustomAlert('Cart Cleared', 'All items have been removed from your cart.', 'success');
    } catch (error) {
      console.error('Failed to clear cart:', error);
      showCustomAlert('Unable to clear cart', error instanceof Error ? error.message : 'Something went wrong. Please try again.', 'error');
    } finally {
      setClearing(false);
    }
  };

  // =====================================================
  // CHECKOUT
  // =====================================================

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      return;
    }

    if (isStoreClosed) {
      showCustomAlert('Store Closed', storeClosedMessage, 'warning');
      return;
    }

    if (itemTotal < minimumOrderAmount) {
      showCustomAlert('Minimum Order Required', `Minimum order amount is ₹${minimumOrderAmount}. Please add ₹${minimumOrderAmount - itemTotal} more to proceed.`, 'warning');
      return;
    }

    try {
      const token = await getAccessToken();

      if (!token) {
        showCustomAlert('Login Required', 'Please login to continue with checkout.', 'warning');

        return;
      }

      router.push('/checkout');
    } catch (error) {
      console.error(
        'Checkout navigation error:',
        error,
      );

      showCustomAlert('Checkout', 'Unable to continue to checkout. Please try again.', 'error');
    }
  };

  // =====================================================
  // BILL CALCULATION (DYNAMIC)
  // =====================================================

  const itemTotal = Number(summary.subtotal) || 0;

  const handlingFee = cartItems.length > 0 ? 5 : 0;
  const grandTotal = itemTotal + handlingFee;

  const minimumOrderAmount = Number(appSettings?.delivery?.minimumOrderAmount) || 0;
  const isStoreClosed = appSettings?.store?.isClosed ?? false;
  const storeClosedMessage = appSettings?.store?.closedMessage ?? 'We are currently closed for orders.';

  // =====================================================
  // FREE DELIVERY UPSALE LOGIC
  // =====================================================
  const freeDeliveryThreshold = Number((appSettings?.delivery as any)?.freeDeliveryAbove) || 200;
  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - itemTotal);
  const freeDeliveryProgress = Math.min((itemTotal / freeDeliveryThreshold) * 100, 100);


  // =====================================================
  // LOADING SCREEN
  // =====================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={[
          'top',
          'left',
          'right',
        ]}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFF"
        />

        <View
          style={styles.loadingContainer}
        >
          <ActivityIndicator
            size="large"
            color="#EAB308"
          />

          <Text
            style={styles.loadingText}
          >
            Loading your cart...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={[
        'top',
        'left',
        'right',
      ]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFF"
      />

      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.backButton}
          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color="#FFF"
          />
        </TouchableOpacity>

        <Text
          style={styles.headerTitle}
        >
          My Cart
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleClearCart}
          disabled={
            clearing ||
            cartItems.length === 0
          }
        >
          {clearing ? (
            <ActivityIndicator
              size="small"
              color="#EF4444"
            />
          ) : (
            <Text
              style={[
                styles.clearCartText,
                cartItems.length ===
                  0 && {
                  opacity: 0.4,
                },
              ]}
            >
              Clear
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {isStoreClosed && (
        <View style={{ backgroundColor: '#FEE2E2', padding: 10, alignItems: 'center' }}>
          <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 13 }}>
            ⚠️ {storeClosedMessage}
          </Text>
        </View>
      )}

      {/* =================================================
          EMPTY CART
      ================================================= */}

      {cartItems.length === 0 ? (
        <MotiView
          from={{
            opacity: 0,
            scale: 0.8,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          style={styles.emptyState}
        >
          <Ionicons
            name="cart-outline"
            size={80}
            color="#D1D5DB"
          />

          <Text
            style={styles.emptyTitle}
          >
            Your cart is empty
          </Text>

          <Text
            style={styles.emptySub}
          >
            Looks like you haven't added
            anything yet.
          </Text>

          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() =>
              router.push('/')
            }
          >
            <Text
              style={styles.browseBtnText}
            >
              Browse Products
            </Text>
          </TouchableOpacity>
        </MotiView>
      ) : (
        <View
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.scrollContent
            }
            onScrollToTop={() => {}}
          >
            {/* =================================================
                DELIVERY BANNER
            ================================================= */}

            <MotiView
              from={{
                opacity: 0,
                translateY: -20,
              }}
              animate={{
                opacity: 1,
                translateY: 0,
              }}
              style={
                styles.deliveryBanner
              }
            >
              <View
                style={
                  styles.deliveryIconCircle
                }
              >
                <Ionicons
                  name="time"
                  size={20}
                  color="#FFF"
                />
              </View>

              <View>
                <Text
                  style={
                    styles.deliveryBannerTitle
                  }
                >
                  Delivery in 10-15 mins
                </Text>

                <Text
                  style={
                    styles.deliveryBannerSub
                  }
                >
                  Shipment of{' '}
                  {summary.totalItems}{' '}
                  items
                </Text>
              </View>
            </MotiView>

            {/* =================================================
                CART ITEMS
            ================================================= */}

            <View
              style={styles.cartList}
            >
              <AnimatePresence>
                {cartItems.map(
                  (
                    item,
                    index,
                  ) => {
                    console.log('CART ITEM DATA:', item);
                    const isUpdating =
                      updatingProductId ===
                      item.productId;

                    const isRemoving =
                      removingProductId ===
                      item.productId;

                    const rawImage = item.images?.[0];
                    const imageUrl = getCartImageUrl(rawImage);

                    return (
                      <MotiView
                        key={item.id}
                        from={{
                          opacity: 0,
                          translateY: 20,
                        }}
                        animate={{
                          opacity: 1,
                          translateY: 0,
                        }}
                        exit={{
                          opacity: 0,
                          translateX: -50,
                        }}
                        transition={{
                          type: 'spring',
                          delay:
                            index * 100,
                        }}
                        style={
                          styles.cartItemCard
                        }
                      >
                        {/* PRODUCT IMAGE */}

                        <View
                          style={
                            styles.itemImagePlaceholder
                          }
                        >
                          {imageUrl ? (
                          <Image
                            source={{
                              uri: imageUrl,
                              headers: { 'ngrok-skip-browser-warning': 'true' }
                            }}
                            style={styles.itemImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Ionicons
                            name="image-outline"
                            size={24}
                            color="#9CA3AF"
                          />
                        )}
                      </View>

                        {/* PRODUCT DETAILS */}

                        <View
                          style={
                            styles.itemDetails
                          }
                        >
                          <Text
                            style={
                              styles.itemName
                            }
                            numberOfLines={
                              2
                            }
                          >
                            {item.name}
                          </Text>

                          <Text
                            style={
                              styles.itemWeight
                            }
                          >
                            {item.weight ||
                              item.unit ||
                              ''}
                          </Text>

                          <Text
                            style={
                              styles.itemPrice
                            }
                          >
                            ₹
                            {item.price}
                          </Text>
                        </View>

                        {/* ACTIONS */}

                        <View
                          style={
                            styles.actionColumn
                          }
                        >
                          <TouchableOpacity
                            onPress={() =>
                              handleRemove(
                                item.productId,
                              )
                            }
                            style={
                              styles.deleteBtn
                            }
                            disabled={
                              isRemoving
                            }
                          >
                            {isRemoving ? (
                              <ActivityIndicator
                                size="small"
                                color="#EF4444"
                              />
                            ) : (
                              <Feather
                                name="trash-2"
                                size={16}
                                color="#EF4444"
                              />
                            )}
                          </TouchableOpacity>

                          {/* QUANTITY */}

                          <View
                            style={
                              styles.qtyBox
                            }
                          >
                            <TouchableOpacity
                              style={
                                styles.qtyBtn
                              }
                              onPress={() =>
                                handleDecrease(
                                  item,
                                )
                              }
                              disabled={
                                isUpdating ||
                                item.quantity <=
                                  1
                              }
                            >
                              <Feather
                                name="minus"
                                size={14}
                                color="#FFF"
                              />
                            </TouchableOpacity>

                            {isUpdating ? (
                              <ActivityIndicator
                                size="small"
                                color="#FFF"
                                style={{
                                  marginHorizontal: 12,
                                }}
                              />
                            ) : (
                              <Text
                                style={
                                  styles.qtyText
                                }
                              >
                                {
                                  item.quantity
                                }
                              </Text>
                            )}

                            <TouchableOpacity
                              style={
                                styles.qtyBtn
                              }
                              onPress={() =>
                                handleIncrease(
                                  item,
                                )
                              }
                              disabled={
                                isUpdating ||
                                item.quantity >=
                                  item.stock
                              }
                            >
                              <Feather
                                name="plus"
                                size={14}
                                color="#FFF"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </MotiView>
                    );
                  },
                )}
              </AnimatePresence>
            </View>

            {/* =================================================
                BILL SUMMARY
            ================================================= */}

            <MotiView
              from={{
                opacity: 0,
                translateY: 30,
              }}
              animate={{
                opacity: 1,
                translateY: 0,
              }}
              transition={{
                delay: 300,
              }}
              style={
                styles.billContainer
              }
            >
              <Text
                style={styles.billTitle}
              >
                Bill Details
              </Text>

              <View
                style={styles.billRow}
              >
                <View
                  style={
                    styles.billRowLeft
                  }
                >
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color="#6B7280"
                    style={{
                      marginRight: 6,
                    }}
                  />

                  <Text
                    style={
                      styles.billText
                    }
                  >
                    Item Total
                  </Text>
                </View>

                <Text
                  style={
                    styles.billValue
                  }
                >
                  ₹{itemTotal}
                </Text>
              </View>

              <View
                style={styles.billRow}
              >
                <View
                  style={
                    styles.billRowLeft
                  }
                >
                  <Ionicons
                    name="bicycle-outline"
                    size={16}
                    color="#6B7280"
                    style={{
                      marginRight: 6,
                    }}
                  />

                  <Text
                    style={
                      styles.billText
                    }
                  >
                    Delivery Fee
                  </Text>
                </View>

                <Text style={[styles.billValue, { color: '#D97706', fontSize: 12 }]}>
                  Calculated at checkout
                </Text>
              </View>

              <View
                style={styles.billRow}
              >
                <View
                  style={
                    styles.billRowLeft
                  }
                >
                  <Ionicons
                    name="bag-handle-outline"
                    size={16}
                    color="#6B7280"
                    style={{
                      marginRight: 6,
                    }}
                  />

                  <Text
                    style={
                      styles.billText
                    }
                  >
                    Handling Fee
                  </Text>
                </View>

                <Text
                  style={
                    styles.billValue
                  }
                >
                  ₹{handlingFee}
                </Text>
              </View>

              <View
                style={styles.divider}
              />

              <View
                style={
                  styles.grandTotalRow
                }
              >
                <Text
                  style={
                    styles.grandTotalText
                  }
                >
                  To Pay
                </Text>

                <Text
                  style={
                    styles.grandTotalValue
                  }
                >
                  ₹{grandTotal}
                </Text>
              </View>
            </MotiView>
          </ScrollView>

          {/* =================================================
              CHECKOUT BAR
          ================================================= */}

          {/* =================================================
              BOTTOM BAR & FREE DELIVERY BANNER
          ================================================= */}

          <MotiView
            from={{ translateY: 150 }}
            animate={{ translateY: 0 }}
            transition={{ type: 'spring', delay: 500 }}
            style={[
              styles.bottomFixedContainer,
              { paddingBottom: Math.max(insets.bottom + 10, 20) }
            ]}
          >
            {/* --- FREE DELIVERY UPSALE BANNER --- */}
            <View style={styles.freeDeliveryWrapper}>
              <View style={styles.freeDeliveryTextRow}>
                {amountNeededForFreeDelivery > 0 ? (
                  <Text style={styles.freeDeliveryText}>
                    Add <Text style={{fontWeight: '900'}}>₹{amountNeededForFreeDelivery.toFixed(0)}</Text> more to get <Text style={{fontWeight: '900'}}>FREE Delivery</Text>
                  </Text>
                ) : (
                  <Text style={styles.freeDeliverySuccessText}>
                    🎉 Free Delivery Unlocked!
                  </Text>
                )}
              </View>
              
              <View style={styles.freeDeliveryProgressBg}>
                <MotiView
                  animate={{ width: `${freeDeliveryProgress}%` }}
                  transition={{ type: 'timing', duration: 600 }}
                  style={[
                    styles.freeDeliveryProgressFill,
                    amountNeededForFreeDelivery === 0 && { backgroundColor: '#10B981' }
                  ]}
                />
              </View>
            </View>

            {/* --- EXISTING CHECKOUT BAR --- */}
            <View style={styles.checkoutBarInner}>
              <View style={styles.checkoutInfo}>
                <Text style={styles.checkoutTotal}>₹{grandTotal}</Text>
                <Text style={styles.checkoutSubText}>TOTAL</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.checkoutBtn,
                  isStoreClosed && { backgroundColor: '#9CA3AF' }
                ]}
                activeOpacity={0.8}
                onPress={handleCheckout}
              >
                <Text style={styles.checkoutBtnText}>
                  {isStoreClosed ? 'Store Closed' : 'Proceed to Pay'}
                </Text>

                {!isStoreClosed && (
                  <Ionicons name="chevron-forward" size={20} color="#1F2937" />
                )}
              </TouchableOpacity>
            </View>
          </MotiView>
        </View>
      )}

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

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
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

  clearCartText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 16,
  },

  emptySub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },

  browseBtn: {
    backgroundColor: '#EAB308',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },

  browseBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  deliveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },

  deliveryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  deliveryBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },

  deliveryBannerSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  cartList: {
    marginBottom: 16,
  },

  cartItemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },

  itemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },

  itemImage: {
    width: '100%',
    height: '100%',
  },

  itemDetails: {
    flex: 1,
    justifyContent: 'center',
  },

  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },

  itemWeight: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },

  itemPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  actionColumn: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  deleteBtn: {
    padding: 4,
    marginBottom: 10,
    minWidth: 24,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#65A30D',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },

  qtyBtn: {
    padding: 4,
  },

  qtyText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 12,
  },

  billContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },

  billTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 16,
  },

  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  billRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  billText: {
    fontSize: 14,
    color: '#4B5563',
  },

  billValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },

  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  grandTotalText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },

  grandTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },

  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 15,
  },

  checkoutInfo: {
    flex: 1,
  },

  checkoutTotal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },

  checkoutSubText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 2,
  },

  checkoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#EAB308',
    paddingHorizontal: 24,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkoutBtnText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 4,
  },

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

  bottomFixedContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 15,
  },

  freeDeliveryWrapper: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderBottomWidth: 0,
  },

  freeDeliveryTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  freeDeliveryText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '600',
  },

  freeDeliverySuccessText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '900',
  },

  freeDeliveryProgressBg: {
    height: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 3,
    overflow: 'hidden',
  },

  freeDeliveryProgressFill: {
    height: '100%',
    backgroundColor: '#34D399', 
    borderRadius: 3,
  },

  checkoutBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
  },
});