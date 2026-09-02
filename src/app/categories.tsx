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
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Ionicons,
  Feather,
} from '@expo/vector-icons';

import { MotiView } from 'moti';

import { SvgUri } from 'react-native-svg';

function isValidIconUrl(icon?: string | null): boolean {
  if (!icon) {
    return false;
  }

  return /^https?:\/\/.+/i.test(icon.trim());
}

import { useRouter } from 'expo-router';

import {
  getCategories,
  Category,
} from '../services/category.api';

const { width } =
  Dimensions.get('window');

export default function CategoriesScreen() {
  const router = useRouter();

  // =====================================================
  // STATE
  // =====================================================

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  // =====================================================
  // LOAD CATEGORIES
  // =====================================================

  const loadCategories = useCallback(
    async () => {
      try {
        setError(null);

        const response =
          await getCategories();

        setCategories(
          response.data,
        );
      } catch (error) {
        console.error(
          'Failed to load categories:',
          error,
        );

        setError(
          'Unable to load categories',
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
    loadCategories();
  }, [loadCategories]);

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    loadCategories();
  };

  // =====================================================
  // OPEN CATEGORY
  // =====================================================

  const handleCategoryPress = (
    category: Category,
  ) => {
    router.push({
      pathname:
        '/category-details',

      params: {
        slug: category.slug,
      },
    });
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
          1. HEADER SECTION
          ================================================= */}

      <View style={styles.header}>
        <View
          style={styles.headerLeft}
        >
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
            All Categories
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Ionicons
            name="refresh"
            size={24}
            color="#EAB308"
          />
        </TouchableOpacity>
      </View>

      {/* =================================================
          2. CATEGORIES GRID
          ================================================= */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* -----------------------------------------------
            LOADING
            ----------------------------------------------- */}

        {loading ? (
          <View
            style={
              styles.loadingContainer
            }
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
              Loading categories...
            </Text>
          </View>
        ) : error ? (
          /* ---------------------------------------------
             ERROR
             --------------------------------------------- */

          <View
            style={
              styles.errorContainer
            }
          >
            <Ionicons
              name="cloud-offline-outline"
              size={50}
              color="#D1D5DB"
            />

            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={
                styles.retryButton
              }
              onPress={() => {
                setLoading(true);
                loadCategories();
              }}
            >
              <Text
                style={
                  styles.retryButtonText
                }
              >
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : categories.length ===
          0 ? (
          /* ---------------------------------------------
             EMPTY
             --------------------------------------------- */

          <View
            style={
              styles.errorContainer
            }
          >
            <Ionicons
              name="grid-outline"
              size={50}
              color="#D1D5DB"
            />

            <Text
              style={
                styles.errorText
              }
            >
              No categories available.
            </Text>
          </View>
        ) : (
          /* ---------------------------------------------
             CATEGORY GRID
             --------------------------------------------- */

          <View
            style={
              styles.gridContainer
            }
          >
            {categories.map(
              (category, index) => (
                <MotiView
                  key={category.id}
                  from={{
                    opacity: 0,
                    translateY: 30,
                    scale: 0.8,
                  }}
                  animate={{
                    opacity: 1,
                    translateY: 0,
                    scale: 1,
                  }}
                  transition={{
                    type: 'spring',
                    delay:
                      (index % 8) * 60,
                    damping: 14,
                    stiffness: 120,
                  }}
                  style={
                    styles.categoryItem
                  }
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={
                      styles.categoryCard
                    }
                    onPress={() =>
                      handleCategoryPress(
                        category,
                      )
                    }
                  >
                    {isValidIconUrl(category.icon) ? (
                      <SvgUri
                        uri={category.icon!.trim()}
                        width={40}
                        height={40}
                      />
                    ) : (
                      <Ionicons
                        name="grid-outline"
                        size={40}
                        color="#EAB308"
                      />
                    )}
                  </TouchableOpacity>

                  <Text
                    style={
                      styles.categoryName
                    }
                    numberOfLines={2}
                  >
                    {category.name}
                  </Text>
                </MotiView>
              ),
            )}
          </View>
        )}
      </ScrollView>

      {/* =================================================
          FIXED BOTTOM NAVIGATION
          ================================================= */}

      <View
        style={styles.bottomNav}
      >
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

        <TouchableOpacity
          style={styles.navItem}
        >
          <Ionicons
            name="grid"
            size={24}
            color="#EAB308"
          />

          <View
            style={
              styles.activeNavDot
            }
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push('/cart')
          }
        >
          <Feather
            name="shopping-bag"
            size={24}
            color="#9CA3AF"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push('/wishlist')
          }
        >
          <Feather
            name="heart"
            size={24}
            color="#9CA3AF"
          />
        </TouchableOpacity>
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

  // =====================================================
  // HEADER
  // =====================================================

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

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAB308',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,

    shadowColor: '#EAB308',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },

  // =====================================================
  // GRID CONTENT
  // =====================================================

  scrollContent: {
    paddingBottom: 100,
    paddingTop: 16,
  },

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent:
      'space-between',
    paddingHorizontal: 16,
  },

  categoryItem: {
    width: '22%',
    alignItems: 'center',
    marginBottom: 24,
  },

  categoryCard: {
    width: width * 0.19,
    height: width * 0.22,
    borderRadius: 16,
    backgroundColor: '#FDFBF7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  emojiIcon: {
    fontSize: 32,
  },

  categoryName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 14,
  },

  // =====================================================
  // LOADING
  // =====================================================

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // =====================================================
  // ERROR
  // =====================================================

  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 24,
  },

  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 16,
    backgroundColor: '#EAB308',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },

  retryButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // =====================================================
  // BOTTOM NAV
  // =====================================================

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
    justifyContent: 'center',
    width: 50,
    height: 40,
  },

  activeNavDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#EAB308',
    position: 'absolute',
    bottom: -2,
  },
});