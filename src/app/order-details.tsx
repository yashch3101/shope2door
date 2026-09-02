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
  ActivityIndicator,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Ionicons,
  Feather,
} from '@expo/vector-icons';

import { MotiView } from 'moti';

import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  getMyOrder,
  cancelOrder,
  type Order,
  type OrderItem,
  type OrderStatus,
} from '../services/order.api';

// =====================================================
// HELPERS
// =====================================================

function toNumber(
  value: number | string | null | undefined,
): number {
  const numberValue = Number(value ?? 0);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

function formatMoney(
  value: number | string | null | undefined,
): string {
  return `₹${toNumber(value).toFixed(0)}`;
}

function formatDate(
  value: string | undefined,
): string {
  if (!value) {
    return 'Date unavailable';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusLabel(
  status: OrderStatus,
): string {
  switch (status) {
    case 'PENDING':
      return 'Order Placed';

    case 'CONFIRMED':
      return 'Order Confirmed';

    case 'PROCESSING':
      return 'Processing';

    case 'PACKED':
      return 'Order Packed';

    case 'DISPATCHED':
      return 'Dispatched';

    case 'OUT_FOR_DELIVERY':
      return 'Out for Delivery';

    case 'DELIVERED':
      return 'Delivered';

    case 'CANCELLED':
      return 'Cancelled';

    case 'RETURN_REQUESTED':
      return 'Return Requested';

    case 'RETURNED':
      return 'Returned';

    case 'REFUNDED':
      return 'Refunded';

    default:
      return status;
  }
}

function getPaymentText(
  order: Order,
): string {
  const payments = Array.isArray(order.payments)
    ? order.payments
    : [];

  const payment = payments[0] as
    | {
        method?: string;
        status?: string;
      }
    | undefined;

  if (payment?.method === 'COD') {
    return 'Cash on Delivery';
  }

  if (payment?.method === 'ONLINE') {
    if (payment.status === 'SUCCESS') {
      return 'Paid Online';
    }

    return 'Online Payment';
  }

  return 'Payment information unavailable';
}

// =====================================================
// SCREEN
// =====================================================

export default function OrderDetailsScreen() {
  const router = useRouter();

  const params =
    useLocalSearchParams<{
      orderId?: string | string[];
    }>();

  const orderId = Array.isArray(params.orderId)
    ? params.orderId[0]
    : params.orderId;

  const [order, setOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [refreshing, setRefreshing] =
  useState(false);

  const [cancelling, setCancelling] =
    useState(false);

  // ===================================================
  // LOAD ORDER
  // ===================================================

  const loadOrder = useCallback(
    async (
      showLoader = true,
    ) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setError(null);

        if (!orderId) {
          setError(
            'Order information is unavailable.',
          );
          return;
        }

        const response =
          await getMyOrder(orderId);

        if (
          response.success &&
          response.data
        ) {
          setOrder(response.data);
        } else {
          throw new Error(
            response.message ||
              'Unable to load order details.',
          );
        }
      } catch (err: any) {
        console.log(
          'Order details loading failed:',
          err,
        );

        setError(
          err?.message ||
            'Unable to load order details. Please try again.',
        );
      } finally {
        setLoading(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'left', 'right']}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFF"
        />

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

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              Order Summary
            </Text>

            <Text style={styles.headerSub}>
              Loading...
            </Text>
          </View>
        </View>

        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color="#EAB308"
          />

          <Text style={styles.centerStateText}>
            Loading order details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ===================================================
  // ERROR
  // ===================================================

  if (error || !order) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'left', 'right']}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFF"
        />

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

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              Order Summary
            </Text>

            <Text style={styles.headerSub}>
              Order Details
            </Text>
          </View>
        </View>

        <View style={styles.centerState}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={42}
              color="#EF4444"
            />
          </View>

          <Text style={styles.errorTitle}>
            Unable to load order
          </Text>

          <Text style={styles.errorText}>
            {error ||
              'Order details are unavailable right now.'}
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.retryButton}
            onPress={() => loadOrder()}
          >
            <Text style={styles.retryButtonText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ===================================================
  // ORDER DATA
  // ===================================================

  const isCancelled =
    order.status === 'CANCELLED';

  const isReturned =
    order.status === 'RETURNED' ||
    order.status === 'REFUNDED';

  const items: OrderItem[] =
    Array.isArray(order.items)
      ? order.items
      : [];

  const address = order.address;

  const paymentText =
    getPaymentText(order);

  const itemTotal =
    toNumber(order.subtotal);

  const discount =
    toNumber(order.discount);

  const deliveryFee =
    toNumber(order.deliveryFee);

  const tax =
    toNumber(order.tax);

  const canCancelOrder =
    !isCancelled &&
    !isReturned &&
    (order.status === 'PENDING' ||
      order.status === 'CONFIRMED' ||
      order.status === 'PROCESSING');

  const handleCancelOrder = async () => {
    if (!orderId || cancelling) {
      return;
    }

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);

              const response =
                await cancelOrder(orderId);

              if (
                response.success &&
                response.data
              ) {
                setOrder((currentOrder) =>
                  currentOrder
                    ? {
                        ...currentOrder,
                        status: 'CANCELLED',
                      }
                    : currentOrder,
                );

                Alert.alert(
                  'Order Cancelled',
                  response.message ||
                    'Your order has been cancelled successfully.',
                );
              } else {
                throw new Error(
                  response.message ||
                    'Unable to cancel this order.',
                );
              }
            } catch (err: any) {
              console.log(
                'Order cancellation failed:',
                err,
              );

              Alert.alert(
                'Unable to Cancel',
                err?.message ||
                  'Unable to cancel the order right now. Please try again.',
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right']}
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
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color="#FFF"
          />
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>
            Order Summary
          </Text>

          <Text style={styles.headerSub}>
            {order.orderNumber
              ? `#${order.orderNumber}`
              : `#${order.id}`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.helpBtn}
          activeOpacity={0.7}
          onPress={() =>
            Alert.alert(
              'Help',
              'For any issue with your order, please contact support.',
            )
          }
        >
          <Text style={styles.helpBtnText}>
            Help
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* =================================================
            ORDER STATUS
        ================================================= */}

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
            delay: 100,
          }}
          style={styles.statusCard}
        >
          <View
            style={[
              styles.statusIconBg,
              isCancelled ||
              isReturned
                ? styles.statusIconErrorBg
                : undefined,
            ]}
          >
            <Ionicons
              name={
                isCancelled
                  ? 'close-circle'
                  : isReturned
                    ? 'return-down-back'
                    : order.status ===
                        'DELIVERED'
                      ? 'checkmark-circle'
                      : 'time'
              }
              size={32}
              color={
                isCancelled ||
                isReturned
                  ? '#EF4444'
                  : order.status ===
                      'DELIVERED'
                    ? '#10B981'
                    : '#EAB308'
              }
            />
          </View>

          <Text style={styles.statusTitle}>
            {isCancelled
              ? 'Order Cancelled'
              : isReturned
                ? getStatusLabel(
                    order.status,
                  )
                : order.status ===
                    'DELIVERED'
                  ? 'Order Delivered Successfully'
                  : getStatusLabel(
                      order.status,
                    )}
          </Text>

          <Text style={styles.statusSub}>
            {formatDate(order.createdAt)}
          </Text>

          <View style={styles.currentStatusBadge}>
            <Text
              style={
                styles.currentStatusText
              }
            >
              {getStatusLabel(
                order.status,
              )}
            </Text>
          </View>
        </MotiView>

        {/* =================================================
            ITEMS
        ================================================= */}

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
            type: 'spring',
            delay: 400,
          }}
          style={styles.sectionContainer}
        >
          <Text
            style={styles.sectionTitle}
          >
            Items in this Order
          </Text>

          <View
            style={styles.itemsCard}
          >
            {items.length === 0 ? (
              <View
                style={styles.noItemsContainer}
              >
                <Text
                  style={styles.noItemsText}
                >
                  No item details available.
                </Text>
              </View>
            ) : (
              items.map(
                (
                  item,
                  index,
                ) => {
                  const name =
                    item.productName ||
                    item.name ||
                    'Product';

                  const weight =
                    item.weight ||
                    item.unit ||
                    '';

                  const unitPrice =
                    toNumber(
                      item.unitPrice ??
                        item.price,
                    );

                  const total =
                    toNumber(
                      item.total,
                    );

                  const displayTotal =
                    total > 0
                      ? total
                      : unitPrice *
                        item.quantity;

                  return (
                    <View
                      key={
                        item.id ||
                        `${item.productId}-${index}`
                      }
                      style={[
                        styles.itemRow,
                        index ===
                          items.length -
                            1 && {
                          borderBottomWidth: 0,
                        },
                      ]}
                    >
                      <View
                        style={
                          styles.itemImagePlaceholder
                        }
                      >
                        <Ionicons
                          name="image-outline"
                          size={20}
                          color="#9CA3AF"
                        />
                      </View>

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
                          {name}
                        </Text>

                        {weight ? (
                          <Text
                            style={
                              styles.itemWeight
                            }
                          >
                            {weight}
                          </Text>
                        ) : null}
                      </View>

                      <View
                        style={
                          styles.itemPriceCol
                        }
                      >
                        <Text
                          style={
                            styles.itemPrice
                          }
                        >
                          {formatMoney(
                            displayTotal,
                          )}
                        </Text>

                        <Text
                          style={
                            styles.itemQty
                          }
                        >
                          Qty:{' '}
                          {
                            item.quantity
                          }
                        </Text>
                      </View>
                    </View>
                  );
                },
              )
            )}
          </View>
        </MotiView>

        {/* =================================================
            BILL DETAILS
        ================================================= */}

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
            type: 'spring',
            delay: 500,
          }}
          style={styles.sectionContainer}
        >
          <Text
            style={styles.sectionTitle}
          >
            Bill Details
          </Text>

          <View
            style={styles.billContainer}
          >
            <View
              style={styles.billRow}
            >
              <Text
                style={styles.billText}
              >
                Item Total
              </Text>

              <Text
                style={styles.billValue}
              >
                {formatMoney(itemTotal)}
              </Text>
            </View>

            {discount > 0 && (
              <View
                style={styles.billRow}
              >
                <Text
                  style={styles.billText}
                >
                  Discount
                </Text>

                <Text
                  style={[
                    styles.billValue,
                    {
                      color:
                        '#10B981',
                    },
                  ]}
                >
                  -{formatMoney(
                    discount,
                  )}
                </Text>
              </View>
            )}

            <View
              style={styles.billRow}
            >
              <Text
                style={styles.billText}
              >
                Delivery Fee
              </Text>

              {deliveryFee <= 0 ? (
                <Text
                  style={[
                    styles.billValue,
                    {
                      color:
                        '#10B981',
                    },
                  ]}
                >
                  FREE
                </Text>
              ) : (
                <Text
                  style={
                    styles.billValue
                  }
                >
                  {formatMoney(
                    deliveryFee,
                  )}
                </Text>
              )}
            </View>

            {tax > 0 && (
              <View
                style={styles.billRow}
              >
                <Text
                  style={styles.billText}
                >
                  Tax
                </Text>

                <Text
                  style={
                    styles.billValue
                  }
                >
                  {formatMoney(tax)}
                </Text>
              </View>
            )}

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
                Total
              </Text>

              <Text
                style={
                  styles.grandTotalValue
                }
              >
                {formatMoney(
                  order.total,
                )}
              </Text>
            </View>

            <View
              style={
                styles.paymentMethodRow
              }
            >
              <Ionicons
                name="wallet-outline"
                size={14}
                color="#065F46"
              />

              <Text
                style={
                  styles.paymentMethodText
                }
              >
                {paymentText}
              </Text>
            </View>
          </View>
        </MotiView>

        {canCancelOrder && (
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
              type: 'spring',
              delay: 550,
            }}
            style={styles.cancelSection}
          >
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                cancelling &&
                  styles.cancelBtnDisabled,
              ]}
              activeOpacity={0.8}
              onPress={handleCancelOrder}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator
                  size="small"
                  color="#EF4444"
                />
              ) : (
                <Ionicons
                  name="close-circle-outline"
                  size={19}
                  color="#EF4444"
                />
              )}

              <Text style={styles.cancelBtnText}>
                {cancelling
                  ? 'Cancelling...'
                  : 'Cancel Order'}
              </Text>
            </TouchableOpacity>
          </MotiView>
        )}

        {/* =================================================
            DELIVERY ADDRESS
        ================================================= */}

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
            type: 'spring',
            delay: 600,
          }}
          style={[
            styles.sectionContainer,
            {
              marginBottom: 40,
            },
          ]}
        >
          <Text
            style={styles.sectionTitle}
          >
            Delivered To
          </Text>

          <View
            style={styles.addressCard}
          >
            <Ionicons
              name="home"
              size={20}
              color="#EAB308"
              style={{
                marginTop: 2,
                marginRight: 12,
              }}
            />

            <View
              style={
                styles.addressContent
              }
            >
              {address ? (
                <>
                  <Text
                    style={
                      styles.addressName
                    }
                  >
                    {address.name}
                  </Text>

                  <Text
                    style={
                      styles.addressPhone
                    }
                  >
                    {address.phone}
                  </Text>

                  <Text
                    style={
                      styles.addressText
                    }
                  >
                    {address.addressLine1}

                    {address.addressLine2
                      ? `, ${address.addressLine2}`
                      : ''}

                    {address.landmark
                      ? `, ${address.landmark}`
                      : ''}

                    {`, ${address.city}, ${address.state} - ${address.pincode}`}
                  </Text>
                </>
              ) : (
                <Text
                  style={
                    styles.addressText
                  }
                >
                  Delivery address
                  information is
                  unavailable.
                </Text>
              )}
            </View>
          </View>
        </MotiView>
      </ScrollView>

      {/* =================================================
          BOTTOM REORDER
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
          delay: 700,
        }}
        style={styles.bottomBar}
      >
        <TouchableOpacity
          style={styles.reorderBtn}
          activeOpacity={0.8}
          onPress={() =>
            router.push('/cart')
          }
        >
          <Feather
            name="refresh-cw"
            size={18}
            color="#1F2937"
            style={{
              marginRight: 8,
            }}
          />

          <Text
            style={
              styles.reorderBtnText
            }
          >
            Reorder Items
          </Text>
        </TouchableOpacity>
      </MotiView>
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

  // ===================================================
  // HEADER
  // ===================================================

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

  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },

  headerSub: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },

  helpBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },

  helpBtnText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
  },

  // ===================================================
  // CENTER STATES
  // ===================================================

  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  centerStateText: {
    marginTop: 14,
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },

  errorIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  errorTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },

  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
  },

  retryButton: {
    backgroundColor: '#EAB308',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },

  retryButtonText: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '800',
  },

  // ===================================================
  // CONTENT
  // ===================================================

  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },

  // ===================================================
  // STATUS
  // ===================================================

  statusCard: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },

  statusIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  statusIconErrorBg: {
    backgroundColor: '#FEE2E2',
  },

  statusTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },

  statusSub: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },

  currentStatusBadge: {
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },

  currentStatusText: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '800',
  },

  // ===================================================
  // SECTIONS
  // ===================================================

  sectionContainer: {
    marginBottom: 24,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
  },

  // ===================================================
  // ITEMS
  // ===================================================

  itemsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },

  noItemsContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },

  noItemsText: {
    fontSize: 13,
    color: '#6B7280',
  },

  itemRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  itemImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  },

  itemPriceCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },

  itemQty: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  // ===================================================
  // BILL
  // ===================================================

  billContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },

  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    marginBottom: 8,
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

  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  paymentMethodText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    marginLeft: 4,
  },

  // ===================================================
  // CANCEL ORDER
  // ===================================================

  cancelSection: {
    marginBottom: 24,
  },

  cancelBtn: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cancelBtnDisabled: {
    opacity: 0.7,
  },

  cancelBtnText: {
    marginLeft: 8,
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '800',
  },

  // ===================================================
  // ADDRESS
  // ===================================================

  addressCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },

  addressContent: {
    flex: 1,
  },

  addressName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 3,
  },

  addressPhone: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 5,
  },

  addressText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },

  // ===================================================
  // BOTTOM BAR
  // ===================================================

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
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

  reorderBtn: {
    flexDirection: 'row',
    backgroundColor: '#EAB308',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  reorderBtnText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '800',
  },
});