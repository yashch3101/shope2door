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
  ScrollView,
  FlatList,
  Alert,
} from 'react-native';

import { addToCart } from '../services/cart.api';

import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from '../services/wishlist.api';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Ionicons,
  Feather,
  MaterialIcons,
} from '@expo/vector-icons';

import { SvgUri } from 'react-native-svg';

import { MotiView } from 'moti';

import {
  useRouter,
  useLocalSearchParams,
} from 'expo-router';

import {
  getCategories,
  getCategoryBySlug,
  Category,
} from '../services/category.api';

import {
  getProducts,
  Product,
} from '../services/product.api';

function isValidIconUrl(icon?: string | null): boolean {
  if (!icon) {
    return false;
  }

  return /^https?:\/\/.+/i.test(icon.trim());
}

export default function CategoryDetailsScreen() {
  const router = useRouter();

  const params = useLocalSearchParams();

  // =====================================================
  // INITIAL CATEGORY
  // =====================================================

  const initialSlug = params.slug
    ? String(params.slug)
    : '';

  // =====================================================
  // STATE
  // =====================================================

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [activeCategory, setActiveCategory] =
    useState<Category | null>(null);

  const [activeCategorySlug, setActiveCategorySlug] =
    useState(initialSlug);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [wishlistState, setWishlistState] =
    useState<Record<string, boolean>>({});

  const [wishlistLoading, setWishlistLoading] =
    useState<Record<string, boolean>>({});

  // =====================================================
  // LOAD PRODUCTS FOR CATEGORY
  // =====================================================

  const loadProductsForCategory = useCallback(
    async (categoryId: string) => {
      try {
        const response =
          await getProducts({
            page: 1,
            limit: 50,
            categoryId,
          });

        setProducts(
          response.data.products,
        );
      } catch (error) {
        console.error(
          'Failed to load category products:',
          error,
        );

        setProducts([]);
      }
    },
    [],
  );

  // =====================================================
  // LOAD CATEGORY DATA
  // =====================================================

  const loadCategoryData = useCallback(
    async (slug: string) => {
      try {
        setLoading(true);

        // -----------------------------------------------
        // Get all categories + selected category
        // -----------------------------------------------

        const [
          categoriesResponse,
          categoryResponse,
        ] = await Promise.all([
          getCategories(),
          getCategoryBySlug(slug),
        ]);

        const allCategories =
          categoriesResponse.data;

        const selectedCategory =
          categoryResponse.data;

        setCategories(
          allCategories,
        );

        setActiveCategory(
          selectedCategory,
        );

        setActiveCategorySlug(
          selectedCategory.slug,
        );

        // -----------------------------------------------
        // Get products of selected category
        // -----------------------------------------------

        await loadProductsForCategory(
          selectedCategory.id,
        );
      } catch (error) {
        console.error(
          'Failed to load category:',
          error,
        );

        setActiveCategory(null);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    [loadProductsForCategory],
  );

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);

        const categoriesResponse =
          await getCategories();

        const allCategories =
          categoriesResponse.data;

        setCategories(
          allCategories,
        );

        // -----------------------------------------------
        // If slug came from Categories screen
        // -----------------------------------------------

        if (initialSlug) {
          const selectedCategory =
            allCategories.find(
              (category) =>
                category.slug ===
                initialSlug,
            );

          if (selectedCategory) {
            setActiveCategory(
              selectedCategory,
            );

            setActiveCategorySlug(
              selectedCategory.slug,
            );

            await loadProductsForCategory(
              selectedCategory.id,
            );

            return;
          }

          // ---------------------------------------------
          // Fallback: resolve through backend
          // ---------------------------------------------

          await loadCategoryData(
            initialSlug,
          );

          return;
        }

        // -----------------------------------------------
        // No slug supplied
        // Use first available category
        // -----------------------------------------------

        const firstCategory =
          allCategories[0];

        if (!firstCategory) {
          setActiveCategory(null);
          setProducts([]);
          return;
        }

        setActiveCategory(
          firstCategory,
        );

        setActiveCategorySlug(
          firstCategory.slug,
        );

        await loadProductsForCategory(
          firstCategory.id,
        );
      } catch (error) {
        console.error(
          'Failed to initialize categories:',
          error,
        );

        setCategories([]);
        setActiveCategory(null);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [
    initialSlug,
    loadCategoryData,
    loadProductsForCategory,
  ]);

  // =====================================================
  // CATEGORY CHANGE
  // =====================================================

  const handleCategoryChange = async (
    category: Category,
  ) => {
    try {
      setActiveCategorySlug(
        category.slug,
      );

      setActiveCategory(
        category,
      );

      setProducts([]);

      await loadProductsForCategory(
        category.id,
      );
    } catch (error) {
      console.error(
        'Failed to change category:',
        error,
      );
    }
  };

  // =====================================================
  // PRODUCT DISCOUNT
  // =====================================================

  const getDiscountPercentage = (
    product: Product,
  ) => {
    const price =
      Number(product.price);

    const mrp =
      Number(product.mrp);

    if (
      !Number.isFinite(price) ||
      !Number.isFinite(mrp) ||
      mrp <= 0 ||
      price >= mrp
    ) {
      return 0;
    }

    return Math.round(
      ((mrp - price) / mrp) * 100,
    );
  };

  const loadWishlist = async () => {
    try {
      const response = await getWishlist();

      const states: Record<string, boolean> = {};

      response.data.items.forEach(item => {
        states[item.productId] = true;
      });

      setWishlistState(states);
    } catch (error) {
      console.log(
        'Failed to load wishlist:',
        error,
      );

      setWishlistState({});
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const handleWishlistToggle = async (
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

        setWishlistState(prev => ({
          ...prev,
          [productId]: false,
        }));
      } else {
        await addToWishlist(productId);

        setWishlistState(prev => ({
          ...prev,
          [productId]: true,
        }));
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

  const handleAddToCart = async (product: Product) => {
    if (product.stock <= 0) {
      Alert.alert(
        'Out of Stock',
        'This product is currently unavailable.',
      );
      return;
    }

    try {
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
    }
  };

  // =====================================================
  // RENDER
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
          1. HEADER
          ================================================= */}

      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color="#FFF"
          />
        </TouchableOpacity>

        <MotiView
          key={activeCategorySlug}
          from={{
            opacity: 0,
            translateX: 20,
          }}
          animate={{
            opacity: 1,
            translateX: 0,
          }}
          transition={{
            type: 'spring',
          }}
        >
          <Text style={styles.headerTitle}>
            {activeCategory?.name ||
              'Categories'}
          </Text>
        </MotiView>
      </View>

      {/* =================================================
          MAIN CONTENT
          ================================================= */}

      <View style={styles.mainContainer}>

        {/* ===============================================
            2. LEFT SIDEBAR
            =============================================== */}

        <View style={styles.sidebar}>
          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={{
              paddingBottom: 100,
            }}
          >
            {categories.map(
              (category, index) => {
                const isActive =
                  category.slug ===
                  activeCategorySlug;

                return (
                  <MotiView
                    key={category.id}
                    from={{
                      opacity: 0,
                      translateX: -20,
                    }}
                    animate={{
                      opacity: 1,
                      translateX: 0,
                    }}
                    transition={{
                      delay:
                        index * 50,
                      type: 'timing',
                      duration: 300,
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[
                        styles.sidebarItem,
                        isActive &&
                          styles.sidebarItemActive,
                      ]}
                      onPress={() =>
                        handleCategoryChange(
                          category,
                        )
                      }
                    >
                      {isActive && (
                        <MotiView
                          from={{
                            height: 0,
                          }}
                          animate={{
                            height: '100%',
                          }}
                          style={
                            styles.activeIndicator
                          }
                        />
                      )}

                      <View
                        style={
                          styles.iconCircle
                        }
                      >
                        {isValidIconUrl(category.icon) ? (
                          <SvgUri
                            uri={category.icon!.trim()}
                            width={32}
                            height={32}
                          />
                        ) : (
                          <Ionicons
                            name="grid-outline"
                            size={32}
                            color="#EAB308"
                          />
                        )}
                      </View>

                      <Text
                        style={[
                          styles.sidebarItemText,
                          isActive &&
                            styles.sidebarItemTextActive,
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  </MotiView>
                );
              },
            )}
          </ScrollView>
        </View>

        {/* ===============================================
            3. RIGHT PRODUCT GRID
            =============================================== */}

        <View
          style={
            styles.productSection
          }
        >
          <MotiView
            key={activeCategorySlug}
            style={{
              flex: 1,
            }}
          >
            <FlatList
              data={products}
              keyExtractor={(item) =>
                item.id
              }
              numColumns={2}
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.gridContent
              }

              renderItem={({
                item,
                index,
              }) => {
                const discount =
                  getDiscountPercentage(
                    item,
                  );

                const inStock =
                  item.stock > 0;

                return (
                  <MotiView
                    from={{
                      opacity: 0,
                      scale: 0.8,
                      translateY: 30,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      translateY: 0,
                    }}
                    transition={{
                      type: 'spring',
                      delay:
                        index * 100,
                      damping: 14,
                    }}
                    style={
                      styles.productCardWrapper
                    }
                  >
                    <View
                      style={
                        styles.productCard
                      }
                    >

                      {/* =================================
                          CARD TOP
                          ================================= */}

                      <View
                        style={
                          styles.cardTop
                        }
                      >
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

                        <TouchableOpacity
                          activeOpacity={0.7}
                          disabled={wishlistLoading[item.id]}
                          onPress={() =>
                            handleWishlistToggle(item.id)
                          }
                          style={styles.heartButton}
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

                      {/* =================================
                          PRODUCT IMAGE
                          ================================= */}

                      <TouchableOpacity
                        activeOpacity={0.9}
                        style={
                          styles.imagePlaceholder
                        }
                        onPress={() => {
                          router.push({
                            pathname:
                              '/product-details',
                            params: {
                              id: item.id,
                            },
                          });
                        }}
                      >
                        <Ionicons
                          name="image-outline"
                          size={40}
                          color="#D1D5DB"
                        />
                      </TouchableOpacity>

                      {/* =================================
                          PRODUCT INFO ROW
                          ================================= */}

                      <View
                        style={
                          styles.infoRow
                        }
                      >
                        <Text
                          style={
                            styles.weightText
                          }
                        >
                          {item.weight ||
                            item.unit ||
                            '1 unit'}
                        </Text>

                        <View
                          style={
                            styles.timeRow
                          }
                        >
                          <MaterialIcons
                            name="timer"
                            size={12}
                            color="#DC2626"
                          />

                          <Text
                            style={
                              styles.timeText
                            }
                          >
                            20-30M
                          </Text>
                        </View>
                      </View>

                      {/* =================================
                          PRODUCT NAME
                          ================================= */}

                      <Text
                        style={
                          styles.productName
                        }
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>

                      {/* =================================
                          PRODUCT PRICE
                          ================================= */}

                      <Text
                        style={
                          styles.productPrice
                        }
                      >
                        ₹
                        {Number(
                          item.price,
                        ).toFixed(2)}
                      </Text>

                      {/* =================================
                          ACTION BUTTON
                          ================================= */}

                      <TouchableOpacity
                        activeOpacity={inStock ? 0.8 : 1}
                        style={[
                          styles.actionBtn,
                          !inStock
                            ? styles.outOfStockBtn
                            : styles.addBtn,
                        ]}
                        disabled={!inStock}
                        onPress={() => {
                          if (inStock) {
                            handleAddToCart(item);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.actionBtnText,

                            !inStock && {
                              color:
                                '#4B5563',
                            },
                          ]}
                        >
                          {inStock
                            ? 'Add to Cart'
                            : 'Out of Stock'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </MotiView>
                );
              }}

              ListEmptyComponent={() => (
                <View
                  style={
                    styles.emptyState
                  }
                >
                  <Ionicons
                    name="basket-outline"
                    size={50}
                    color="#D1D5DB"
                  />

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    {loading
                      ? 'Loading products...'
                      : 'No items found in this category.'}
                  </Text>
                </View>
              )}
            />
          </MotiView>
        </View>
      </View>
    </SafeAreaView>
  );
}

// =======================================================
// STYLES
// =======================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: 16,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },

  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },

  sidebar: {
    width: 90,
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },

  sidebarItem: {
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    position: 'relative',
  },

  sidebarItemActive: {
    backgroundColor: '#FFF',
  },

  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#EAB308',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },

  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },

  emojiIcon: {
    fontSize: 24,
  },

  sidebarItemText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '600',
  },

  sidebarItemTextActive: {
    color: '#1F2937',
    fontWeight: '800',
  },

  productSection: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  gridContent: {
    padding: 8,
    paddingBottom: 100,
  },

  productCardWrapper: {
    width: '50%',
    padding: 6,
  },

  productCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  discountBadge: {
    backgroundColor: '#2E7D32',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
  },

  discountText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },

  imagePlaceholder: {
    height: 80,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  weightText: {
    fontSize: 10,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  timeText: {
    fontSize: 9,
    color: '#DC2626',
    fontWeight: '700',
    marginLeft: 2,
  },

  productName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    height: 34,
    lineHeight: 16,
    marginBottom: 6,
  },

  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },

  actionBtn: {
    flexDirection: 'row',
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  addBtn: {
    backgroundColor: '#65A30D',
  },

  optionsBtn: {
    backgroundColor: '#EAB308',
  },

  outOfStockBtn: {
    backgroundColor: '#E5E7EB',
  },

  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },

  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  heartButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});