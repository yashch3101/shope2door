import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Ionicons,
  Feather,
} from '@expo/vector-icons';

import { MotiView } from 'moti';

import { useRouter } from 'expo-router';

import {
  getAccessToken,
} from '../services/auth.storage';

import {
  getWishlist,
  removeFromWishlist,
  clearWishlist,
  type WishlistItem,
} from '../services/wishlist.api';

import {
  addToCart,
} from '../services/cart.api';

const { width } = Dimensions.get('window');

const API_BASE_URL = 'https://drop-down-underwire-impulse.ngrok-free.dev/api/v1';

// =====================================================
// SCREEN
// =====================================================

export default function WishlistScreen() {
  const router = useRouter();

  // ===================================================
  // STATE
  // ===================================================

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [items, setItems] =
    useState<WishlistItem[]>([]);

  const [removingId, setRemovingId] =
    useState<string | null>(null);

  const [clearing, setClearing] =
    useState(false);

  // ===================================================
  // LOAD WISHLIST
  // ===================================================

  const loadWishlist = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const token =
          await getAccessToken();

        // ---------------------------------------------
        // USER NOT LOGGED IN
        // ---------------------------------------------

        if (!token) {
          setIsLoggedIn(false);
          setItems([]);
          return;
        }

        // ---------------------------------------------
        // USER LOGGED IN
        // ---------------------------------------------

        setIsLoggedIn(true);

        const response =
          await getWishlist();

        if (response.success) {
          setItems(
            response.data.items ?? [],
          );
        } else {
          setItems([]);
        }
      } catch (error) {
        console.error(
          'Failed to load wishlist:',
          error,
        );

        // ---------------------------------------------
        // If token/session is invalid
        // ---------------------------------------------

        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load wishlist.';

        // Don't show an annoying alert on initial
        // unauthenticated state.
        if (
          !message
            .toLowerCase()
            .includes('login')
        ) {
          Alert.alert(
            'Wishlist',
            message,
          );
        }

        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const handleAddToCart = async (
    productId: string,
  ) => {
    try {
      await addToCart(productId, 1);

      Alert.alert(
        'Added to Cart',
        'Product has been added to your cart.',
        [
          {
            text: 'Continue Shopping',
            style: 'cancel',
          },
          {
            text: 'View Cart',
            onPress: () => {
              router.push('/cart');
            },
          },
        ],
      );
    } catch (error) {
      console.error(
        'Failed to add wishlist product to cart:',
        error,
      );

      Alert.alert(
        'Unable to Add',
        error instanceof Error
          ? error.message
          : 'Unable to add product to cart.',
      );
    }
  };

  // ===================================================
  // REFRESH
  // ===================================================

  const handleRefresh = async () => {
    if (
      loading ||
      refreshing
    ) {
      return;
    }

    setRefreshing(true);

    await loadWishlist(false);
  };

  // ===================================================
  // REMOVE PRODUCT
  // ===================================================

  const handleRemove = async (
    productId: string,
  ) => {
    if (removingId) {
      return;
    }

    try {
      setRemovingId(productId);

      await removeFromWishlist(
        productId,
      );

      // Optimistic UI update after
      // successful backend request.
      setItems((currentItems) =>
        currentItems.filter(
          (item) =>
            item.productId !== productId,
        ),
      );
    } catch (error) {
      console.error(
        'Failed to remove wishlist item:',
        error,
      );

      Alert.alert(
        'Unable to Remove',
        error instanceof Error
          ? error.message
          : 'Unable to remove product from wishlist.',
      );
    } finally {
      setRemovingId(null);
    }
  };

  // ===================================================
  // CLEAR WISHLIST
  // ===================================================

  const handleClearWishlist = () => {
    if (
      clearing ||
      items.length === 0
    ) {
      return;
    }

    Alert.alert(
      'Clear Wishlist',
      'Are you sure you want to remove all products from your wishlist?',
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

              await clearWishlist();

              setItems([]);
            } catch (error) {
              console.error(
                'Failed to clear wishlist:',
                error,
              );

              Alert.alert(
                'Unable to Clear',
                error instanceof Error
                  ? error.message
                  : 'Unable to clear wishlist.',
              );
            } finally {
              setClearing(false);
            }
          },
        },
      ],
    );
  };

  // ===================================================
  // LOGIN
  // ===================================================

  const handleLogin = () => {
    /*
     * Your current home screen owns the login modal
     * state. We don't have a dedicated login route
     * confirmed here.
     *
     * For now, take the user back to home where the
     * existing authentication UI is available.
     */
    router.push('/');
  };

  // ===================================================
  // PRODUCT CARD
  // ===================================================

  const renderWishlistCard = (
    item: WishlistItem,
    index: number,
  ) => {
    const product =
      item.product;

    const price =
      Number(product.price);

    const mrp =
      Number(product.mrp);

    const discount =
      mrp > price && mrp > 0
        ? Math.round(
            ((mrp - price) / mrp) *
              100,
          )
        : 0;

    const image =
      product.images &&
      product.images.length > 0
        ? product.images[0]
        : null;

    const isRemoving =
      removingId ===
      item.productId;

    return (
      <MotiView
        key={item.id}
        from={{
          opacity: 0,
          translateY: 30,
          scale: 0.92,
        }}
        animate={{
          opacity: 1,
          translateY: 0,
          scale: 1,
        }}
        transition={{
          type: 'spring',
          delay: index * 80,
          damping: 14,
        }}
        style={styles.wishlistCard}
      >
        {/* =========================================
            REMOVE BUTTON
        ========================================= */}

        <TouchableOpacity
          style={styles.removeBtn}
          activeOpacity={0.7}
          onPress={() =>
            handleRemove(
              item.productId,
            )
          }
          disabled={isRemoving}
        >
          {isRemoving ? (
            <ActivityIndicator
              size="small"
              color="#EF4444"
            />
          ) : (
            <Ionicons
              name="close-circle"
              size={23}
              color="#EF4444"
            />
          )}
        </TouchableOpacity>

        {/* =========================================
            PRODUCT IMAGE
        ========================================= */}

        <View
          style={
            styles.imageContainer
          }
        >
          {image ? (
            <Image
              source={{
                uri: `${API_BASE_URL}/${image}?ngrok-skip-browser-warning=true`,
                headers: { 'ngrok-skip-browser-warning': 'true' }
              }}
              style={
                styles.productImage
              }
              resizeMode="contain"
            />
          ) : (
            <Ionicons
              name="image-outline"
              size={40}
              color="#D1D5DB"
            />
          )}

          {/* Discount badge */}

          {discount > 0 && (
            <View
              style={
                styles.discountBadge
              }
            >
              <Text
                style={
                  styles.discountText
                }
              >
                {discount}% OFF
              </Text>
            </View>
          )}
        </View>

        {/* =========================================
            PRODUCT INFO
        ========================================= */}

        <Text
          style={styles.itemWeight}
        >
          {product.weight ||
            product.unit ||
            '1 unit'}
        </Text>

        <Text
          style={styles.itemName}
          numberOfLines={2}
        >
          {product.name}
        </Text>

        {/* =========================================
            PRICE
        ========================================= */}

        <View
          style={styles.priceRow}
        >
          <Text
            style={styles.itemPrice}
          >
            ₹{price.toFixed(0)}
          </Text>

          {mrp > price && (
            <Text
              style={styles.itemMrp}
            >
              ₹{mrp.toFixed(0)}
            </Text>
          )}
        </View>

        {/* =========================================
            STOCK
        ========================================= */}

        {!product.isActive ? (
          <Text
            style={
              styles.unavailableText
            }
          >
            Unavailable
          </Text>
        ) : product.stock <= 0 ? (
          <Text
            style={
              styles.outOfStockText
            }
          >
            Out of stock
          </Text>
        ) : (
          <Text
            style={
              styles.inStockText
            }
          >
            In stock
          </Text>
        )}

        {/* =========================================
            ADD TO CART
        ========================================= */}

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.addToCartBtn,
            (!product.isActive ||
              product.stock <= 0) &&
              styles.disabledCartBtn,
          ]}
          disabled={
            !product.isActive ||
            product.stock <= 0
          }
          onPress={() =>
            handleAddToCart(item.productId)
          }
        >
          <Text
            style={[
              styles.addToCartText,
              (!product.isActive ||
                product.stock <= 0) &&
                styles.disabledCartText,
            ]}
          >
            Add to Cart
          </Text>
        </TouchableOpacity>
      </MotiView>
    );
  };

  // ===================================================
  // LOADING STATE
  // ===================================================

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

        {/* Header */}

        <View
          style={styles.header}
        >
          <View
            style={
              styles.headerLeft
            }
          >
            <TouchableOpacity
              activeOpacity={0.7}
              style={
                styles.backButton
              }
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
              style={
                styles.headerTitle
              }
            >
              Wishlist
            </Text>
          </View>

          <Ionicons
            name="refresh"
            size={24}
            color="#D1D5DB"
          />
        </View>

        <View
          style={styles.loadingContainer}
        >
          <ActivityIndicator
            size="large"
            color="#EAB308"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading wishlist...
          </Text>
        </View>

        <BottomNavigation
          router={router}
        />
      </SafeAreaView>
    );
  }

  // ===================================================
  // MAIN UI
  // ===================================================

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

      {/* =============================================
          HEADER
      ============================================= */}

      <View
        style={styles.header}
      >
        <View
          style={styles.headerLeft}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            style={
              styles.backButton
            }
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
            Wishlist
          </Text>

          {isLoggedIn &&
            items.length > 0 && (
              <View
                style={
                  styles.countBadge
                }
              >
                <Text
                  style={
                    styles.countBadgeText
                  }
                >
                  {items.length}
                </Text>
              </View>
            )}
        </View>

        <View
          style={styles.headerActions}
        >
          {/* Clear */}

          {isLoggedIn &&
            items.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={
                  handleClearWishlist
                }
                disabled={clearing}
                style={
                  styles.clearButton
                }
              >
                {clearing ? (
                  <ActivityIndicator
                    size="small"
                    color="#EF4444"
                  />
                ) : (
                  <Feather
                    name="trash-2"
                    size={20}
                    color="#EF4444"
                  />
                )}
              </TouchableOpacity>
            )}

          {/* Refresh */}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={
              handleRefresh
            }
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator
                size="small"
                color="#EAB308"
              />
            ) : (
              <Ionicons
                name="refresh"
                size={24}
                color="#EAB308"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* =============================================
          CONTENT
      ============================================= */}

      <View
        style={
          styles.contentContainer
        }
      >
        {/* ==========================================
            NOT LOGGED IN
        ========================================== */}

        {!isLoggedIn ? (
          <MotiView
            from={{
              opacity: 0,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              type: 'spring',
            }}
            style={
              styles.emptyStateContainer
            }
          >
            {/* Heart Animation */}

            <MotiView
              from={{
                scale: 1,
              }}
              animate={{
                scale: 1.12,
              }}
              transition={{
                loop: true,
                type: 'timing',
                duration: 1000,
              }}
            >
              <Feather
                name="heart"
                size={70}
                color="#9CA3AF"
                style={
                  styles.emptyIcon
                }
              />
            </MotiView>

            <Text
              style={styles.emptyText}
            >
              Please login to view
              your wishlist
            </Text>

            <Text
              style={
                styles.emptySubText
              }
            >
              Save your favourite
              products and access
              them anytime.
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.loginBtn}
              onPress={
                handleLogin
              }
            >
              <Text
                style={
                  styles.loginBtnText
                }
              >
                Login Now
              </Text>
            </TouchableOpacity>
          </MotiView>
        ) : items.length === 0 ? (
          /* ========================================
             LOGGED IN + EMPTY
          ======================================== */

          <MotiView
            from={{
              opacity: 0,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              type: 'spring',
            }}
            style={
              styles.emptyStateContainer
            }
          >
            <MotiView
              from={{
                scale: 1,
              }}
              animate={{
                scale: 1.08,
              }}
              transition={{
                loop: true,
                type: 'timing',
                duration: 1200,
              }}
            >
              <Feather
                name="heart"
                size={70}
                color="#D1D5DB"
                style={
                  styles.emptyIcon
                }
              />
            </MotiView>

            <Text
              style={styles.emptyText}
            >
              Your wishlist is empty
            </Text>

            <Text
              style={
                styles.emptySubText
              }
            >
              Add products you love
              to see them here.
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.loginBtn}
              onPress={() =>
                router.push('/')
              }
            >
              <Text
                style={
                  styles.loginBtnText
                }
              >
                Explore Products
              </Text>
            </TouchableOpacity>
          </MotiView>
        ) : (
          /* ========================================
             LOGGED IN + PRODUCTS
          ======================================== */

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.scrollContent
            }
          >
            {/* Wishlist heading */}

            <View
              style={
                styles.listHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.listTitle
                  }
                >
                  My Wishlist
                </Text>

                <Text
                  style={
                    styles.listSubtitle
                  }
                >
                  {items.length}{' '}
                  {items.length ===
                  1
                    ? 'product'
                    : 'products'}{' '}
                  saved
                </Text>
              </View>
            </View>

            {/* Grid */}

            <View
              style={
                styles.gridContainer
              }
            >
              {items.map(
                (
                  item,
                  index,
                ) =>
                  renderWishlistCard(
                    item,
                    index,
                  ),
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* =============================================
          BOTTOM NAVIGATION
      ============================================= */}

      <BottomNavigation
        router={router}
      />
    </SafeAreaView>
  );
}

// =====================================================
// BOTTOM NAVIGATION
// =====================================================

type BottomNavigationProps = {
  router: ReturnType<
    typeof useRouter
  >;
};

function BottomNavigation({
  router,
}: BottomNavigationProps) {
  return (
    <View
      style={styles.bottomNav}
    >
      {/* Home */}

      <TouchableOpacity
        style={styles.navItem}
        onPress={() =>
          router.push('/')
        }
      >
        <Ionicons
          name="home-outline"
          size={24}
          color="#9CA3AF"
        />
      </TouchableOpacity>

      {/* Categories */}

      <TouchableOpacity
        style={styles.navItem}
        onPress={() =>
          router.push(
            '/categories',
          )
        }
      >
        <Ionicons
          name="grid-outline"
          size={24}
          color="#9CA3AF"
        />
      </TouchableOpacity>

      {/* Orders */}

      <TouchableOpacity
        style={styles.navItem}
        onPress={() =>
          router.push('/orders')
        }
      >
        <Feather
          name="shopping-bag"
          size={24}
          color="#9CA3AF"
        />
      </TouchableOpacity>

      {/* Wishlist */}

      <TouchableOpacity
        style={styles.navItem}
      >
        <Feather
          name="heart"
          size={24}
          color="#EAB308"
        />

        <View
          style={
            styles.activeNavDot
          }
        />
      </TouchableOpacity>
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  // ===================================================
  // HEADER
  // ===================================================

  header: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor:
      '#F3F4F6',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAB308',
    justifyContent:
      'center',
    alignItems: 'center',
    marginRight: 12,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },

  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent:
      'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 7,
  },

  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },

  clearButton: {
    justifyContent:
      'center',
    alignItems: 'center',
  },

  // ===================================================
  // CONTENT
  // ===================================================

  contentContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // ===================================================
  // LOADING
  // ===================================================

  loadingContainer: {
    flex: 1,
    justifyContent:
      'center',
    alignItems: 'center',
    backgroundColor:
      '#F9FAFB',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  // ===================================================
  // EMPTY STATE
  // ===================================================

  emptyStateContainer: {
    flex: 1,
    justifyContent:
      'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    marginTop: -50,
  },

  emptyIcon: {
    marginBottom: 20,
  },

  emptyText: {
    fontSize: 17,
    color: '#374151',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },

  emptySubText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
    marginBottom: 24,
  },

  loginBtn: {
    backgroundColor: '#EAB308',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,

    shadowColor: '#EAB308',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  loginBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // ===================================================
  // LIST HEADER
  // ===================================================

  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },

  listHeader: {
    marginBottom: 16,
  },

  listTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },

  listSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 3,
  },

  // ===================================================
  // GRID
  // ===================================================

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent:
      'space-between',
  },

  wishlistCard: {
    width: width * 0.44,

    backgroundColor: '#FFF',

    borderRadius: 16,

    padding: 12,

    marginBottom: 16,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,

    elevation: 3,
  },

  // ===================================================
  // REMOVE
  // ===================================================

  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,

    zIndex: 10,

    width: 28,
    height: 28,

    justifyContent:
      'center',
    alignItems: 'center',
  },

  // ===================================================
  // IMAGE
  // ===================================================

  imageContainer: {
    height: 105,

    backgroundColor:
      '#F3F4F6',

    borderRadius: 12,

    alignItems: 'center',
    justifyContent:
      'center',

    marginBottom: 12,
    marginTop: 8,

    overflow: 'hidden',
  },

  productImage: {
    width: '100%',
    height: '100%',
  },

  discountBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,

    backgroundColor:
      '#16A34A',

    paddingHorizontal: 6,
    paddingVertical: 3,

    borderRadius: 5,
  },

  discountText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },

  // ===================================================
  // PRODUCT INFO
  // ===================================================

  itemWeight: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },

  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 7,

    minHeight: 36,

    lineHeight: 18,
  },

  // ===================================================
  // PRICE
  // ===================================================

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  itemPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  itemMrp: {
    fontSize: 11,
    color: '#9CA3AF',
    textDecorationLine:
      'line-through',
    marginLeft: 6,
    fontWeight: '500',
  },

  // ===================================================
  // STOCK
  // ===================================================

  inStockText: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '700',
    marginBottom: 10,
  },

  outOfStockText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '700',
    marginBottom: 10,
  },

  unavailableText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '700',
    marginBottom: 10,
  },

  // ===================================================
  // CART BUTTON
  // ===================================================

  addToCartBtn: {
    backgroundColor: '#F3F4F6',

    paddingVertical: 9,

    borderRadius: 8,

    alignItems: 'center',
    justifyContent:
      'center',
  },

  addToCartText: {
    color: '#1F2937',
    fontWeight: '700',
    fontSize: 12,
  },

  disabledCartBtn: {
    backgroundColor:
      '#E5E7EB',
  },

  disabledCartText: {
    color: '#9CA3AF',
  },

  // ===================================================
  // BOTTOM NAV
  // ===================================================

  bottomNav: {
    position: 'absolute',
    bottom: 0,

    width: '100%',

    backgroundColor: '#FFF',

    flexDirection: 'row',
    justifyContent:
      'space-around',
    alignItems: 'center',

    paddingVertical: 12,
    paddingBottom: 25,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,

    elevation: 15,

    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  navItem: {
    alignItems: 'center',
    justifyContent:
      'center',

    width: 50,
    height: 40,
  },

  activeNavDot: {
    width: 5,
    height: 5,

    borderRadius: 3,

    backgroundColor:
      '#EAB308',

    position: 'absolute',
    bottom: -2,
  },
});