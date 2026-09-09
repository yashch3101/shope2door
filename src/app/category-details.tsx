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
  Image,
  Dimensions,
} from 'react-native';

import { addToCart, getCart } from '../services/cart.api';

import { getAppSettings, AppSettings } from '../services/settings.api';
import { getAccessToken } from '../services/auth.storage';

import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from '../services/wishlist.api';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Ionicons,
  Feather,
  MaterialIcons,
} from '@expo/vector-icons';

import { MotiView, AnimatePresence } from 'moti';

import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

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

  const insets = useSafeAreaInsets();

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info'
  });

  const showCustomAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const API_BASE_URL = 'https://drop-down-underwire-impulse.ngrok-free.dev/api/v1';

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

  // NAYA STATE: SUB-CATEGORY TRACK KARNE KE LIYE
  const [activeSubCategorySlug, setActiveSubCategorySlug] = 
    useState<string | null>(null);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [wishlistState, setWishlistState] =
    useState<Record<string, boolean>>({});

  const [wishlistLoading, setWishlistLoading] =
    useState<Record<string, boolean>>({});

  // =====================================================
  // CART & SETTINGS STATE FOR FREE DELIVERY BANNER
  // =====================================================
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  // Cart Fetcher
  const loadCartAndSettings = useCallback(async () => {
    try {
      const settingsRes = await getAppSettings();
      if (settingsRes.success && settingsRes.data) {
        setAppSettings(settingsRes.data);
      }

      const token = await getAccessToken();
      if (!token) return;

      const response = await getCart();
      if (response.success && response.data) {
        setCartSubtotal(Number(response.data.summary.subtotal) || 0);
        setTotalItems(Number(response.data.summary.totalItems) || 0);
      }
    } catch (error) {
      console.log('Failed to load cart for banner:', error);
    }
  }, []);

  useEffect(() => {
    loadCartAndSettings();
  }, [loadCartAndSettings]);

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
        // Get products of selected category OR sub-category
        // -----------------------------------------------
        if (selectedCategory.subCategories && selectedCategory.subCategories.length > 0) {
          const firstSub = selectedCategory.subCategories[0];
          setActiveSubCategorySlug(firstSub.slug);
          await loadProductsForCategory(firstSub.id);
        } else {
          setActiveSubCategorySlug(null);
          await loadProductsForCategory(selectedCategory.id);
        }

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

            // NAYA LOGIC: Check for sub-categories
            if ((selectedCategory as any).subCategories && (selectedCategory as any).subCategories.length > 0) {
              const firstSub = (selectedCategory as any).subCategories[0];
              setActiveSubCategorySlug(firstSub.slug);
              await loadProductsForCategory(firstSub.id);
            } else {
              setActiveSubCategorySlug(null);
              await loadProductsForCategory(selectedCategory.id);
            }

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

        // NAYA LOGIC: Check for sub-categories
        if ((firstCategory as any).subCategories && (firstCategory as any).subCategories.length > 0) {
          const firstSub = (firstCategory as any).subCategories[0];
          setActiveSubCategorySlug(firstSub.slug);
          await loadProductsForCategory(firstSub.id);
        } else {
          setActiveSubCategorySlug(null);
          await loadProductsForCategory(firstCategory.id);
        }

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
  // SIDEBAR CLICK HANDLER
  // =====================================================
  const handleSidebarPress = async (
    item: Category,
  ) => {
    try {
      setProducts([]); // Purane products hatao loading ke liye
      
      // Agar currently sub-categories dikh rahi hain
      if ((activeCategory as any)?.subCategories && (activeCategory as any).subCategories.length > 0) {
        setActiveSubCategorySlug(item.slug);
        await loadProductsForCategory(item.id);
      } else {
        // Agar main categories dikh rahi hain (fallback)
        setActiveCategorySlug(item.slug);
        setActiveCategory(item);
        
        if ((item as any).subCategories && (item as any).subCategories.length > 0) {
          const firstSub = (item as any).subCategories[0];
          setActiveSubCategorySlug(firstSub.slug);
          await loadProductsForCategory(firstSub.id);
        } else {
          setActiveSubCategorySlug(null);
          await loadProductsForCategory(item.id);
        }
      }
    } catch (error) {
      console.error('Failed to change category:', error);
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

      showCustomAlert(
        'Wishlist',
        error instanceof Error ? error.message : 'Unable to update wishlist.',
        'error'
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
      showCustomAlert(
        'Out of Stock',
        'This product is currently unavailable.',
        'warning'
      );
      return;
    }

    try {
      // Pass product.id directly
      await addToCart(product.id, 1);
      await loadCartAndSettings();

      showCustomAlert(
        'Added to Cart',
        `${product.name} has been added to your cart.`,
        'success'
      );
    } catch (error) {
      console.error(
        'Failed to add product to cart:',
        error,
      );

      showCustomAlert(
        'Unable to Add',
        error instanceof Error ? error.message : 'Unable to add product to cart.',
        'error'
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
            2. LEFT SIDEBAR (UPDATED FOR SUB-CATEGORIES)
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
            {/* AGAR SUB-CATEGORIES HAIN TOH WO DIKHAO, WARNA MAIN CATEGORIES */}
            {((activeCategory as any)?.subCategories && (activeCategory as any).subCategories.length > 0
              ? (activeCategory as any).subCategories
              : categories
            ).map(
              (item: Category, index: number) => {
                
                // Active check: Sub-category vs Main category
                const isActive = (activeCategory as any)?.subCategories && (activeCategory as any).subCategories.length > 0
                  ? item.slug === activeSubCategorySlug
                  : item.slug === activeCategorySlug;

                return (
                  <MotiView
                    key={item.id}
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
                        handleSidebarPress(
                          item,
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

                      <View style={styles.iconCircle}>
                        {isValidIconUrl(item.icon) ? (
                          <NgrokSvg
                            uri={
                              item.icon?.startsWith('http')
                                ? item.icon.trim()
                                : `${API_BASE_URL}/${item.icon!.trim()}`
                            }
                            width={32}
                            height={32}
                          />
                        ) : (
                          <Ionicons name="fast-food-outline" size={32} color="#EAB308" />
                        )}
                      </View>

                      <Text
                        style={[
                          styles.sidebarItemText,
                          isActive &&
                            styles.sidebarItemTextActive,
                        ]}
                      >
                        {item.name}
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
            key={activeSubCategorySlug || activeCategorySlug}
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
              contentContainerStyle={[
                styles.gridContent,
                { paddingBottom: Math.max(insets.bottom + 20, 100) }
              ]}

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
                        style={styles.imagePlaceholder}
                        onPress={() => {
                          router.push({
                            pathname: '/product-details',
                            params: { id: item.id },
                          });
                        }}
                      >
                        {item.images && item.images.length > 0 ? (
                          <Image
                            source={{ 
                              uri: item.images[0].startsWith('http') 
                                ? item.images[0] 
                                : `${API_BASE_URL}/${item.images[0]}`,
                              headers: { 'ngrok-skip-browser-warning': 'true' }
                            }}
                            style={{ width: '100%', height: '100%', borderRadius: 12 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Ionicons name="image-outline" size={40} color="#D1D5DB" />
                        )}
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

      {/* =================================================
          BOTTOM FLOATING FREE DELIVERY BANNER
      ================================================= */}
      {totalItems > 0 && (
        <MotiView
          from={{ translateY: 100, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          style={[styles.floatingBannerContainer, { paddingBottom: Math.max(insets.bottom + 10, 20) }]}
        >
          {(() => {
            const threshold = Number((appSettings?.delivery as any)?.freeDeliveryAbove) || 200;
            const amountNeeded = Math.max(0, threshold - cartSubtotal);
            const progress = Math.min((cartSubtotal / threshold) * 100, 100);

            return (
              <View style={styles.floatingBannerInner}>
                <View style={styles.freeDeliveryContent}>
                  <View style={{ marginBottom: 6 }}>
                    {amountNeeded > 0 ? (
                      <Text style={styles.freeDeliveryText}>
                        Add <Text style={{fontWeight: '900'}}>₹{amountNeeded.toFixed(0)}</Text> more to unlock <Text style={{fontWeight: '900'}}>Free Delivery</Text>
                      </Text>
                    ) : (
                      <Text style={styles.freeDeliverySuccessText}>
                        🎉 Free Delivery Unlocked!
                      </Text>
                    )}
                  </View>
                  
                  {/* Progress Bar */}
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }, amountNeeded === 0 && { backgroundColor: '#10B981' }]} />
                  </View>
                </View>

                {/* View Cart Button */}
                <TouchableOpacity 
                  style={styles.viewCartBtn} 
                  activeOpacity={0.8}
                  onPress={() => router.push('/cart')}
                >
                  <Text style={styles.viewCartBtnText}>Cart</Text>
                  <View style={styles.cartCountBadge}>
                    <Text style={styles.cartCountText}>{totalItems}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })()}
        </MotiView>
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

const NgrokSvg = ({ uri, width, height }: { uri: string, width: number, height: number }) => {
  const [hasError, setHasError] = useState(false);

  let sanitizedUri = uri ? uri.trim().replace(/\s+/g, '%20') : '';

  if (sanitizedUri.includes('api.iconify.design') && sanitizedUri.endsWith('.svg')) {
    sanitizedUri = sanitizedUri.replace('.svg', '.png') + '?width=120';
  }

  if (!sanitizedUri || !sanitizedUri.startsWith('http') || hasError) {
    return (
      <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEF9C3', borderRadius: 25 }}>
        <Ionicons name="fast-food-outline" size={width * 0.55} color="#CA8A04" />
      </View>
    );
  }

  return (
    <Image 
      source={{ 
        uri: sanitizedUri,
        headers: { 'ngrok-skip-browser-warning': 'true' }
      }}
      style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
      onError={() => {
        console.log("Failed to load icon:", sanitizedUri);
        setHasError(true);
      }}
    />
  );
};

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
    overflow: 'hidden',
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

  floatingBannerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    zIndex: 99,
  },
  
  floatingBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937', 
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },

  freeDeliveryContent: {
    flex: 1,
    paddingRight: 12,
  },

  freeDeliveryText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },

  freeDeliverySuccessText: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '900',
  },

  progressBarBg: {
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    overflow: 'hidden',
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: '#EAB308',
    borderRadius: 2,
  },

  viewCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },

  viewCartBtnText: {
    color: '#1F2937',
    fontWeight: '800',
    fontSize: 14,
    marginRight: 6,
  },

  cartCountBadge: {
    backgroundColor: '#FFF',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cartCountText: {
    color: '#1F2937',
    fontSize: 10,
    fontWeight: '900',
  },
});