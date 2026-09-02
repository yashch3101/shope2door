import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  PanResponder,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';

import {
  getMyOrders,
  Order,
  OrderStatus,
} from '../services/order.api';

const { height } = Dimensions.get('window');

// =====================================================
// TYPES
// =====================================================

type OrderTab = 'Active' | 'Complete';

// =====================================================
// STATUS HELPERS
// =====================================================

const ACTIVE_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'DISPATCHED',
  'OUT_FOR_DELIVERY',
];

const COMPLETE_STATUSES: OrderStatus[] = [
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
  'REFUNDED',
];

// =====================================================
// STATUS LABEL
// =====================================================

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Order Placed';

    case 'CONFIRMED':
      return 'Confirmed';

    case 'PROCESSING':
      return 'Processing';

    case 'PACKED':
      return 'Packed';

    case 'DISPATCHED':
      return 'Dispatched';

    case 'OUT_FOR_DELIVERY':
      return 'On the way';

    case 'DELIVERED':
      return 'Delivered';

    case 'CANCELLED':
      return 'Cancelled';

    case 'RETURN_REQUESTED':
      return 'Return requested';

    case 'RETURNED':
      return 'Returned';

    case 'REFUNDED':
      return 'Refunded';

    default:
      return status;
  }
}

// =====================================================
// STATUS COLOR
// =====================================================

function getStatusColor(status: OrderStatus): string {
  switch (status) {
    case 'DELIVERED':
      return '#10B981';

    case 'CANCELLED':
      return '#EF4444';

    case 'RETURN_REQUESTED':
    case 'RETURNED':
      return '#F59E0B';

    case 'REFUNDED':
      return '#8B5CF6';

    case 'OUT_FOR_DELIVERY':
      return '#F59E0B';

    case 'DISPATCHED':
      return '#3B82F6';

    case 'PACKED':
      return '#3B82F6';

    case 'PROCESSING':
      return '#3B82F6';

    case 'CONFIRMED':
      return '#10B981';

    case 'PENDING':
    default:
      return '#6B7280';
  }
}

// =====================================================
// FORMAT DATE
// =====================================================

function formatOrderDate(dateString: string): string {
  try {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

// =====================================================
// FORMAT TIME
// =====================================================

function formatOrderTime(dateString: string): string {
  try {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// =====================================================
// FORMAT MONEY
// =====================================================

function formatMoney(
  value: number | string | undefined,
): string {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return '₹0';
  }

  return `₹${amount.toFixed(0)}`;
}

// =====================================================
// ORDER ITEMS TEXT
// =====================================================

function getOrderItemsText(order: Order): string {
  if (!order.items || order.items.length === 0) {
    return 'Order items';
  }

  const totalItems = order.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

  // Backend uses productName.
  // name is kept as a compatibility fallback.
  const itemNames = order.items
    .map(
      (item) =>
        item.productName ||
        item.name ||
        'Product',
    )
    .filter(Boolean);

  const visibleNames = itemNames
    .slice(0, 2)
    .join(', ');

  const remainingItems =
    itemNames.length - 2;

  if (remainingItems > 0) {
    return `${totalItems} ${
      totalItems === 1 ? 'Item' : 'Items'
    } • ${visibleNames}...`;
  }

  return `${totalItems} ${
    totalItems === 1 ? 'Item' : 'Items'
  } • ${visibleNames}`;
}

// =====================================================
// ORDER CARD
// =====================================================

interface OrderCardProps {
  order: Order;
  index: number;
}

function OrderCard({
  order,
  index,
}: OrderCardProps) {
  const router = useRouter();

  const statusColor =
    getStatusColor(order.status);

  const orderNumber =
    order.orderNumber || order.id;

  const orderDate =
    formatOrderDate(order.createdAt);

  const orderTime =
    formatOrderTime(order.createdAt);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() =>
        router.push({
          pathname: '/order-details',
          params: {
            orderId: order.id,
          },
        })
      }
    >
      <MotiView
        from={{
          opacity: 0,
          translateY: 20,
        }}
        animate={{
          opacity: 1,
          translateY: 0,
        }}
        transition={{
          delay: index * 100 + 100,
          type: 'timing',
        }}
        style={styles.orderCard}
      >
      {/* ORDER HEADER */}

      <View style={styles.orderHeader}>
        <Text
          style={styles.orderId}
          numberOfLines={1}
        >
          Order #{orderNumber}
        </Text>

        <Text style={styles.orderTotal}>
          {formatMoney(order.total)}
        </Text>
      </View>

      {/* ORDER ITEMS */}

      <Text
        style={styles.orderItems}
        numberOfLines={1}
      >
        {getOrderItemsText(order)}
      </Text>

      {/* COUPON */}

      {order.discount !== undefined &&
        Number(order.discount) > 0 && (
          <View style={styles.savingsRow}>
            <Feather
              name="tag"
              size={12}
              color="#10B981"
            />

            <Text style={styles.savingsText}>
              Saved {formatMoney(order.discount)}
              {order.couponCode
                ? ` • ${order.couponCode}`
                : ''}
            </Text>
          </View>
        )}

      {/* DIVIDER */}

      <View style={styles.orderDivider} />

      {/* FOOTER */}

      <View style={styles.orderFooter}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  statusColor,
              },
            ]}
          />

          <Text
            style={[
              styles.orderStatus,
              {
                color: statusColor,
              },
            ]}
          >
            {getStatusLabel(order.status)}
          </Text>
        </View>

        <View style={styles.dateTimeContainer}>
          {orderDate ? (
            <Text style={styles.orderTime}>
              {orderDate}
            </Text>
          ) : null}

          {orderTime ? (
            <Text style={styles.orderTime}>
              {orderTime}
            </Text>
          ) : null}
        </View>
      </View>
        </MotiView>
  </TouchableOpacity>
  );
}

// =====================================================
// MAIN SCREEN
// =====================================================

export default function OrdersScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] =
    useState<OrderTab>('Active');

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [refreshing, setRefreshing] =
    useState<boolean>(false);

  const [error, setError] =
    useState<string | null>(null);

  // ===================================================
  // ACTIVE TAB REF
  // ===================================================

  const activeTabRef =
    useRef(activeTab);

  activeTabRef.current = activeTab;

  // ===================================================
  // LOAD ORDERS
  // ===================================================

  const loadOrders = useCallback(
    async (
      showLoader = true,
    ) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setError(null);

        const response =
          await getMyOrders();

        if (!response.success) {
          throw new Error(
            'Unable to load orders',
          );
        }

        setOrders(
          Array.isArray(response.data)
            ? response.data
            : [],
        );
      } catch (err) {
        console.error(
          'Orders loading error:',
          err,
        );

        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load your orders';

        setError(message);
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
    loadOrders();
  }, [loadOrders]);

  // ===================================================
  // REFRESH
  // ===================================================

  const handleRefresh =
    useCallback(
      async () => {
        setRefreshing(true);

        await loadOrders(false);
      },
      [loadOrders],
    );

  // ===================================================
  // FILTER ORDERS
  // ===================================================

  const currentData = useMemo(() => {
    if (activeTab === 'Active') {
      return orders.filter((order) =>
        ACTIVE_STATUSES.includes(
          order.status,
        ),
      );
    }

    return orders.filter((order) =>
      COMPLETE_STATUSES.includes(
        order.status,
      ),
    );
  }, [orders, activeTab]);

  // ===================================================
  // SWIPE TABS
  // ===================================================

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () =>
        false,

      onMoveShouldSetPanResponder: (
        evt,
        gestureState,
      ) => {
        return (
          Math.abs(gestureState.dx) > 30 &&
          Math.abs(gestureState.dx) >
            Math.abs(gestureState.dy)
        );
      },

      onPanResponderRelease: (
        evt,
        gestureState,
      ) => {
        if (
          gestureState.dx > 50 &&
          activeTabRef.current !== 'Active'
        ) {
          setActiveTab('Active');
        } else if (
          gestureState.dx < -50 &&
          activeTabRef.current !== 'Complete'
        ) {
          setActiveTab('Complete');
        }
      },
    }),
  ).current;

  // ===================================================
  // RENDER LOADING
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

        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
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

            <Text style={styles.headerTitle}>
              My Order
            </Text>
          </View>
        </View>

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
            Loading your orders...
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

      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>
        <View style={styles.headerLeft}>
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

          <Text style={styles.headerTitle}>
            My Order
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleRefresh}
          disabled={refreshing}
          style={styles.refreshButton}
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

      {/* =================================================
          TABS
      ================================================= */}

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() =>
            setActiveTab('Active')
          }
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'Active' &&
                styles.activeTabText,
            ]}
          >
            Active
          </Text>

          {activeTab === 'Active' && (
            <MotiView
              from={{
                scaleX: 0,
              }}
              animate={{
                scaleX: 1,
              }}
              style={styles.activeLine}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() =>
            setActiveTab('Complete')
          }
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'Complete' &&
                styles.activeTabText,
            ]}
          >
            Complete
          </Text>

          {activeTab === 'Complete' && (
            <MotiView
              from={{
                scaleX: 0,
              }}
              animate={{
                scaleX: 1,
              }}
              style={styles.activeLine}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* =================================================
          ORDER LIST
      ================================================= */}

      <View
        style={{ flex: 1 }}
        {...panResponder.panHandlers}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.scrollContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#EAB308"
              colors={['#EAB308']}
            />
          }
        >
          {/* ERROR */}

          {error ? (
            <View
              style={styles.errorContainer}
            >
              <View
                style={styles.errorIcon}
              >
                <Feather
                  name="alert-circle"
                  size={28}
                  color="#EF4444"
                />
              </View>

              <Text
                style={styles.errorTitle}
              >
                Couldn't load orders
              </Text>

              <Text
                style={styles.errorText}
              >
                {error}
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                style={
                  styles.retryButton
                }
                onPress={() =>
                  loadOrders()
                }
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
          ) : (
            <MotiView
              key={activeTab}
              from={{
                opacity: 0,
                translateX:
                  activeTab === 'Active'
                    ? -40
                    : 40,
              }}
              animate={{
                opacity: 1,
                translateX: 0,
              }}
              transition={{
                type: 'timing',
                duration: 400,
              }}
            >
              {currentData.length > 0 ? (
                currentData.map(
                  (order, index) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      index={index}
                    />
                  ),
                )
              ) : (
                <View
                  style={
                    styles.emptyState
                  }
                >
                  <View
                    style={
                      styles.emptyIconContainer
                    }
                  >
                    <Feather
                      name="shopping-bag"
                      size={54}
                      color="#9CA3AF"
                    />
                  </View>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    No{' '}
                    {activeTab.toLowerCase()}{' '}
                    orders
                  </Text>

                  <Text
                    style={
                      styles.emptySubText
                    }
                  >
                    {activeTab ===
                    'Active'
                      ? 'Your ongoing orders will appear here.'
                      : 'Your delivered and completed orders will appear here.'}
                  </Text>
                </View>
              )}
            </MotiView>
          )}
        </ScrollView>
      </View>

      {/* =================================================
          BOTTOM NAVIGATION
      ================================================= */}

      <BottomNavigation
        router={router}
      />
    </SafeAreaView>
  );
}

// =====================================================
// BOTTOM NAVIGATION
// =====================================================

function BottomNavigation({
  router,
}: {
  router: ReturnType<
    typeof useRouter
  >;
}) {
  return (
    <View style={styles.bottomNav}>
      {/* HOME */}

      <TouchableOpacity
        style={styles.navItem}
        onPress={() =>
          router.push('/')
        }
        activeOpacity={0.7}
      >
        <Ionicons
          name="home-outline"
          size={24}
          color="#9CA3AF"
        />
      </TouchableOpacity>

      {/* CATEGORIES */}

      <TouchableOpacity
        style={styles.navItem}
        onPress={() =>
          router.push('/categories')
        }
        activeOpacity={0.7}
      >
        <Ionicons
          name="grid-outline"
          size={24}
          color="#9CA3AF"
        />
      </TouchableOpacity>

      {/* ORDERS ACTIVE */}

      <TouchableOpacity
        style={styles.navItem}
        activeOpacity={0.7}
      >
        <Feather
          name="shopping-bag"
          size={24}
          color="#EAB308"
        />

        <View
          style={styles.activeNavDot}
        />
      </TouchableOpacity>

      {/* WISHLIST */}

      <TouchableOpacity
        style={styles.navItem}
        onPress={() =>
          router.push('/wishlist')
        }
        activeOpacity={0.7}
      >
        <Feather
          name="heart"
          size={24}
          color="#9CA3AF"
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
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
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },

  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ===================================================
  // TABS
  // ===================================================

  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },

  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },

  activeTabText: {
    color: '#111827',
    fontWeight: '800',
  },

  activeLine: {
    position: 'absolute',
    bottom: -1,
    width: '100%',
    height: 3,
    backgroundColor: '#EAB308',
    borderRadius: 2,
  },

  // ===================================================
  // SCROLL
  // ===================================================

  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    flexGrow: 1,
  },

  // ===================================================
  // ORDER CARD
  // ===================================================

  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,

    elevation: 3,

    borderWidth: 1,
    borderColor: '#F3F4F6',
  },

  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  orderId: {
    flex: 1,
    marginRight: 12,
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },

  orderTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },

  orderItems: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },

  // ===================================================
  // SAVINGS
  // ===================================================

  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  savingsText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#10B981',
    fontWeight: '700',
  },

  // ===================================================
  // DIVIDER
  // ===================================================

  orderDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: -16,
    marginBottom: 12,
  },

  // ===================================================
  // FOOTER
  // ===================================================

  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  orderStatus: {
    fontSize: 13,
    fontWeight: '700',
  },

  dateTimeContainer: {
    alignItems: 'flex-end',
  },

  orderTime: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },

  // ===================================================
  // EMPTY
  // ===================================================

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: height * 0.12,
    paddingHorizontal: 30,
  },

  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  emptyText: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '700',
  },

  emptySubText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // ===================================================
  // LOADING
  // ===================================================

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },

  // ===================================================
  // ERROR
  // ===================================================

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    marginTop: height * 0.12,
  },

  errorIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
  },

  errorText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#6B7280',
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#EAB308',
  },

  retryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
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
    justifyContent: 'space-around',
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