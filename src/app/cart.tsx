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

import { SafeAreaView } from 'react-native-safe-area-context';
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

import { getAccessToken } from '../services/auth.storage';

const { width } = Dimensions.get('window');

export default function CartScreen() {
  const router = useRouter();

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

        Alert.alert(
          'Unable to load cart',
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
        );
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
      Alert.alert(
        'Stock limit reached',
        `Only ${item.stock} units are available.`,
      );

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

      Alert.alert(
        'Unable to update cart',
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
      );
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

      Alert.alert(
        'Unable to remove item',
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setRemovingProductId(null);
    }
  };

  // =====================================================
  // CLEAR CART
  // =====================================================

  const handleClearCart = () => {
    if (cartItems.length === 0) {
      return;
    }

    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
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
            } catch (error) {
              console.error(
                'Failed to clear cart:',
                error,
              );

              Alert.alert(
                'Unable to clear cart',
                error instanceof Error
                  ? error.message
                  : 'Something went wrong. Please try again.',
              );
            } finally {
              setClearing(false);
            }
          },
        },
      ],
    );
  };

  // =====================================================
  // CHECKOUT
  // =====================================================

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      return;
    }

    try {
      const token = await getAccessToken();

      if (!token) {
        Alert.alert(
          'Login Required',
          'Please login to continue with checkout.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Login',
              onPress: () => {
                router.push('/');
              },
            },
          ],
        );

        return;
      }

      // Navigate to real checkout screen
      router.push('/checkout');
    } catch (error) {
      console.error(
        'Checkout navigation error:',
        error,
      );

      Alert.alert(
        'Checkout',
        'Unable to continue to checkout. Please try again.',
      );
    }
  };

  // =====================================================
  // BILL
  // =====================================================

  const itemTotal =
    summary.subtotal;

  const deliveryFee =
    itemTotal > 200 ? 0 : 40;

  const handlingFee =
    cartItems.length > 0 ? 5 : 0;

  const grandTotal =
    itemTotal +
    deliveryFee +
    handlingFee;

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
                    const isUpdating =
                      updatingProductId ===
                      item.productId;

                    const isRemoving =
                      removingProductId ===
                      item.productId;

                    const image =
                      item.images?.[0];

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
                          {image ? (
                            <Image
                              source={{
                                uri: image,
                              }}
                              style={
                                styles.itemImage
                              }
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

                <Text
                  style={
                    styles.billValue
                  }
                >
                  {deliveryFee ===
                  0 ? (
                    <Text
                      style={{
                        color:
                          '#10B981',
                      }}
                    >
                      FREE
                    </Text>
                  ) : (
                    `₹${deliveryFee}`
                  )}
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

          <MotiView
            from={{
              translateY: 100,
            }}
            animate={{
              translateY: 0,
            }}
            transition={{
              type: 'spring',
              delay: 500,
            }}
            style={
              styles.checkoutBar
            }
          >
            <View
              style={
                styles.checkoutInfo
              }
            >
              <Text
                style={
                  styles.checkoutTotal
                }
              >
                ₹{grandTotal}
              </Text>

              <Text
                style={
                  styles.checkoutSubText
                }
              >
                TOTAL
              </Text>
            </View>

            <TouchableOpacity
              style={
                styles.checkoutBtn
              }
              activeOpacity={0.8}
              onPress={
                handleCheckout
              }
            >
              <Text
                style={
                  styles.checkoutBtnText
                }
              >
                Proceed to Pay
              </Text>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#1F2937"
              />
            </TouchableOpacity>
          </MotiView>
        </View>
      )}
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
});