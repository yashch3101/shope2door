import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Ionicons,
  MaterialIcons,
} from '@expo/vector-icons';

import { MotiView } from 'moti';

import {
  useRouter,
  useLocalSearchParams,
  useFocusEffect,
} from 'expo-router';

import {
  getCart,
  Cart,
} from '../services/cart.api';

import {
  getAddresses,
  Address,
} from '../services/address.api';

import {
  createOrder,
} from '../services/order.api';

import {
  getAvailableCoupons,
  validateCoupon,
} from '../services/coupon.api';

import type {
  Coupon,
} from '../services/coupon.api';

import {
  initiatePayment,
  verifyPayment,
} from '../services/payment.api';

import {
  getMe,
  User,
} from '../services/auth.api';

import {
  getAccessToken,
} from '../services/auth.storage';

import RazorpayCheckout from 'react-native-razorpay';


export default function CheckoutScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    addressId?: string | string[];
  }>();

  /*
   * expo-router params can sometimes be string[]
   * so normalize it into a single string.
   */
  const selectedAddressIdParam = Array.isArray(
    params.addressId,
  )
    ? params.addressId[0]
    : params.addressId;


  // =====================================================
  // STATE
  // =====================================================

  const [
    selectedPayment,
    setSelectedPayment,
  ] = useState<'UPI' | 'CARD' | 'COD'>('COD');

  const [
    cart,
    setCart,
  ] = useState<Cart | null>(null);

  const [
    addresses,
    setAddresses,
  ] = useState<Address[]>([]);

  const [
    selectedAddress,
    setSelectedAddress,
  ] = useState<Address | null>(null);

  const [
    currentUser,
    setCurrentUser,
  ] = useState<User | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    placingOrder,
    setPlacingOrder,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    coupons,
    setCoupons,
  ] = useState<Coupon[]>([]);

  const [
    showCouponModal,
    setShowCouponModal,
  ] = useState(false);

  const [
    couponLoading,
    setCouponLoading,
  ] = useState(false);

  const [
    couponApplying,
    setCouponApplying,
  ] = useState(false);

  const [
    selectedCoupon,
    setSelectedCoupon,
  ] = useState<Coupon | null>(null);

  const [
    couponDiscount,
    setCouponDiscount,
  ] = useState(0);

  const openCouponModal = async () => {
    try {
      setShowCouponModal(true);
      setCouponLoading(true);

      const response =
        await getAvailableCoupons();

      if (response.success) {
        setCoupons(
          Array.isArray(
            response.data.coupons,
          )
            ? response.data.coupons
            : [],
        );
      }
    } catch (err) {
      console.error(
        'Coupon loading error:',
        err,
      );

      Alert.alert(
        'Coupons',
        err instanceof Error
          ? err.message
          : 'Unable to load coupons.',
      );
    } finally {
      setCouponLoading(false);
    }
  };


  // =====================================================
  // LOAD CHECKOUT DATA
  // =====================================================

  const loadCheckoutData = useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);

        const accessToken =
          await getAccessToken();

        if (!accessToken) {
          throw new Error(
            'Please login to continue.',
          );
        }

        const [
          cartResponse,
          addressResponse,
          couponResponse,
          userResponse,
        ] = await Promise.all([
          getCart(),
          getAddresses(),
          getAvailableCoupons(),
          getMe(accessToken),
        ]);

        setCurrentUser(userResponse.data);

        const fetchedCoupons =
          couponResponse.data.coupons;

        setCoupons(
          Array.isArray(fetchedCoupons)
            ? fetchedCoupons
            : [],
        );

        const fetchedCart =
          cartResponse.data;

        const fetchedAddresses =
          addressResponse.data.addresses ?? [];

        setCart(fetchedCart);
        setAddresses(fetchedAddresses);


        // =================================================
        // SELECT ADDRESS
        // =================================================
        //
        // Priority:
        //
        // 1. addressId received from Delivery Address page
        // 2. default address
        // 3. first address
        // 4. null
        //
        // This fixes the main issue where checkout was
        // always selecting the default address.
        // =================================================

        let addressToSelect:
          | Address
          | null = null;


        if (selectedAddressIdParam) {
          addressToSelect =
            fetchedAddresses.find(
              (address) =>
                address.id ===
                selectedAddressIdParam,
            ) ?? null;
        }


        if (!addressToSelect) {
          addressToSelect =
            fetchedAddresses.find(
              (address) =>
                address.isDefault === true,
            ) ??
            fetchedAddresses[0] ??
            null;
        }


        setSelectedAddress(
          addressToSelect,
        );


        // =================================================
        // EMPTY CART CHECK
        // =================================================

        if (
          !fetchedCart ||
          fetchedCart.items.length === 0
        ) {
          setError(
            'Your cart is empty. Please add products before checkout.',
          );
        }

      } catch (err) {
        console.error(
          'Checkout loading error:',
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load checkout',
        );

      } finally {
        setLoading(false);
      }
    },
    [selectedAddressIdParam],
  );


  // =====================================================
  // LOAD WHEN SCREEN OPENS / COMES BACK INTO FOCUS
  // =====================================================
  //
  // useFocusEffect is important here.
  //
  // User goes:
  //
  // Checkout
  //   ↓
  // Delivery Address
  //   ↓
  // Select address
  //   ↓
  // Checkout
  //
  // When checkout becomes active again, we reload the
  // address list and selected address.
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      loadCheckoutData();
    }, [loadCheckoutData]),
  );


  // =====================================================
  // TOTALS
  // =====================================================

  const totalItems =
    cart?.summary.totalItems ?? 0;

  const subtotal =
    cart?.summary.subtotal ?? 0;

  const totalSavings =
    cart?.summary.totalSavings ?? 0;


  /*
   * Delivery fee is currently FREE.
   *
   * Final order amount is still calculated and validated
   * by backend OrderService.
   */

  const deliveryFee = 0;

  const grandTotal = Math.max(
    0,
    subtotal -
      couponDiscount +
      deliveryFee,
  );


  // =====================================================
  // OPEN DELIVERY ADDRESS SCREEN
  // =====================================================

  const handleChangeAddress = () => {
    router.push({
      pathname: '/delivery-address',
      params: {
        returnTo: 'checkout',

        ...(selectedAddress?.id
          ? {
              addressId:
                selectedAddress.id,
            }
          : {}),
      },
    });
  };

  const handleApplyCoupon = async (
    coupon: Coupon,
  ) => {
    if (couponApplying) {
      return;
    }

    try {
      setCouponApplying(true);

      const response =
        await validateCoupon({
          code: coupon.code,
          cartAmount: subtotal,
        });

      if (!response.success) {
        throw new Error(
          response.message ||
            'Unable to apply coupon',
        );
      }

      const discount =
        Number(
          response.data.calculation.discount,
        ) || 0;

      setSelectedCoupon(
        coupon,
      );

      setCouponDiscount(
        discount,
      );

      setShowCouponModal(false);

      Alert.alert(
        'Coupon Applied',
        `${coupon.code} applied successfully.\nYou saved ₹${discount.toFixed(2)}.`,
      );
    } catch (err) {
      console.error(
        'Coupon apply error:',
        err,
      );

      Alert.alert(
        'Coupon Not Applied',
        err instanceof Error
          ? err.message
          : 'Unable to apply this coupon.',
      );
    } finally {
      setCouponApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    setSelectedCoupon(null);
    setCouponDiscount(0);
  };


  // =====================================================
  // PLACE ORDER
  // =====================================================

  const handlePlaceOrder =
    async () => {

      if (placingOrder) {
        return;
      }


      // -----------------------------------------------
      // CART VALIDATION
      // -----------------------------------------------

      if (
        !cart ||
        cart.items.length === 0
      ) {
        Alert.alert(
          'Cart Empty',
          'Please add products to your cart before checkout.',
        );

        return;
      }


      // -----------------------------------------------
      // ADDRESS VALIDATION
      // -----------------------------------------------

      if (!selectedAddress) {
        Alert.alert(
          'Delivery Address',
          'Please select a delivery address before placing your order.',
          [
            {
              text: 'Select Address',
              onPress:
                handleChangeAddress,
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ],
        );

        return;
      }


      try {
        setPlacingOrder(true);


        // =================================================
        // STEP 1
        // CREATE ORDER
        // =================================================

        /*
         * IMPORTANT:
         *
         * Actual database address ID is sent here.
         *
         * Backend validates that this address belongs
         * to the authenticated user.
         */

        const orderResponse =
          await createOrder({
            addressId:
              selectedAddress.id,

            ...(selectedCoupon?.code
              ? {
                  couponCode:
                    selectedCoupon.code,
                }
              : {}),
          });


        const order =
          orderResponse.data;


        if (!order?.id) {
          throw new Error(
            'Order creation failed',
          );
        }


        // =================================================
        // STEP 2
        // COD
        // =================================================

        if (
          selectedPayment === 'COD'
        ) {

          await initiatePayment({
            orderId: order.id,
            paymentMethod: 'COD',
          });


          Alert.alert(
            'Order Placed',
            `Your order ${
              order.orderNumber ?? ''
            } has been placed successfully.`,
            [
              {
                text: 'View Orders',

                onPress: () =>
                  router.replace(
                    '/orders',
                  ),
              },
            ],
          );


          return;
        }


        // =================================================
        // STEP 3
        // ONLINE PAYMENT
        // =================================================
        //
        // UPI + CARD both map to ONLINE
        // because backend PaymentMethod enum
        // contains only COD and ONLINE.
        // =================================================

        const paymentResponse =
          await initiatePayment({
            orderId: order.id,
            paymentMethod: 'ONLINE',
          });


        const payment =
          paymentResponse.data;


        console.log(
          'Payment initiation response:',
          payment,
        );


        // =================================================
        // RAZORPAY SDK STEP
        // =================================================

        if (
          !payment.razorpayOrderId ||
          !payment.razorpayKeyId
        ) {
          throw new Error(
            'Payment gateway order was not created correctly.',
          );
        }


        // =================================================
        // STEP 4
        // OPEN RAZORPAY CHECKOUT
        // =================================================

        if (!currentUser) {
          throw new Error(
            'Unable to load customer information.',
          );
        }

        const razorpayOptions = {
          key: payment.razorpayKeyId,

          amount: Math.round(
            payment.amount * 100,
          ),

          currency:
            payment.currency || 'INR',

          name: 'Shop2Door',

          description:
            `Payment for order ${
              order.orderNumber ?? order.id
            }`,

          order_id:
            payment.razorpayOrderId,

          prefill: {
            name: currentUser.name,

            email: currentUser.email,

            contact:
              currentUser.phone
                ? `+91${currentUser.phone.replace(
                    /^\+91/,
                    '',
                  )}`
                : undefined,
          },

          theme: {
            color: '#EAB308',
          },

          modal: {
            confirm_close: true,
            escape: true,
          },
        };

        console.log(
          'Opening Razorpay Checkout:',
          {
            orderId:
              payment.razorpayOrderId,
            amount:
              payment.amount,
            currency:
              payment.currency,
          },
        );

        const razorpayResult =
          await RazorpayCheckout.open(
            razorpayOptions,
          );

        console.log(
          'Razorpay success:',
          razorpayResult,
        );

        if (
          !razorpayResult?.razorpay_order_id ||
          !razorpayResult?.razorpay_payment_id ||
          !razorpayResult?.razorpay_signature
        ) {
          throw new Error(
            'Payment completed but payment details could not be verified.',
          );
        }

        // =================================================
        // STEP 5
        // VERIFY PAYMENT ON BACKEND
        // =================================================

        const verificationResponse =
          await verifyPayment({
            orderId: order.id,

            razorpayOrderId:
              razorpayResult.razorpay_order_id,

            razorpayPaymentId:
              razorpayResult.razorpay_payment_id,

            razorpaySignature:
              razorpayResult.razorpay_signature,
          });

        console.log(
          'Payment verification response:',
          verificationResponse,
        );

        if (
          !verificationResponse.success
        ) {
          throw new Error(
            verificationResponse.message ||
              'Payment verification failed.',
          );
        }

        // =================================================
        // STEP 6
        // PAYMENT SUCCESS
        // =================================================

        Alert.alert(
          'Payment Successful',
          `Your order ${
            order.orderNumber ?? ''
          } has been placed successfully.`,
          [
            {
              text: 'View Orders',

              onPress: () =>
                router.replace(
                  '/orders',
                ),
            },
          ],
        );

      } catch (err) {
        console.error(
          'Place order error:',
          err,
        );

        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Unable to place your order. Please try again.';

        // Razorpay checkout cancelled by user
        const razorpayError =
          err as {
            code?: string | number;
            description?: string;
          };

        const isRazorpayCancelled =
          razorpayError?.code === 0 ||
          razorpayError?.code === '0' ||
          razorpayError?.description
            ?.toLowerCase()
            .includes('cancel');

        if (isRazorpayCancelled) {
          Alert.alert(
            'Payment Cancelled',
            'You cancelled the payment. Your order has not been confirmed.',
          );

          return;
        }

        Alert.alert(
          'Order Failed',
          errorMessage,
        );
      } finally {
        setPlacingOrder(false);
      }
    };


  // =====================================================
  // LOADING
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
          backgroundColor="#F9FAFB"
        />

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
            style={styles.loadingText}
          >
            Loading checkout...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
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
          backgroundColor="#F9FAFB"
        />

        <View
          style={styles.errorContainer}
        >
          <Ionicons
            name="alert-circle-outline"
            size={58}
            color="#EF4444"
          />

          <Text
            style={styles.errorTitle}
          >
            Unable to load checkout
          </Text>

          <Text
            style={styles.errorMessage}
          >
            {error}
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.retryButton}
            onPress={
              loadCheckoutData
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

          <TouchableOpacity
            activeOpacity={0.8}
            style={
              styles.backToCartButton
            }
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={
                styles.backToCartText
              }
            >
              Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  // =====================================================
  // MAIN UI
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
        backgroundColor="#F9FAFB"
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
          Checkout
        </Text>

      </View>


      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >


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
            delay: 100,
          }}
          style={
            styles.sectionContainer
          }
        >

          <View
            style={styles.sectionHeader}
          >

            <Text
              style={
                styles.sectionTitle
              }
            >
              Delivery Address
            </Text>


            <TouchableOpacity
              activeOpacity={0.7}
              onPress={
                handleChangeAddress
              }
            >
              <Text
                style={
                  styles.changeText
                }
              >
                Change
              </Text>
            </TouchableOpacity>

          </View>


          {/* =================================================
              SELECTED ADDRESS
          ================================================= */}

          {selectedAddress ? (

            <View
              style={styles.addressCard}
            >

              <View
                style={
                  styles.addressIconBg
                }
              >
                <Ionicons
                  name={
                    selectedAddress.type ===
                    'WORK'
                      ? 'business'
                      : selectedAddress.type ===
                        'OTHER'
                        ? 'location-outline'
                        : 'home'
                  }
                  size={20}
                  color="#EAB308"
                />
              </View>


              <View
                style={
                  styles.addressDetails
                }
              >

                <View
                  style={
                    styles.addressTagRow
                  }
                >

                  <Text
                    style={
                      styles.addressName
                    }
                  >
                    {selectedAddress.name}
                  </Text>


                  <View
                    style={
                      styles.tagBadge
                    }
                  >
                    <Text
                      style={
                        styles.tagText
                      }
                    >
                      {selectedAddress.type ===
                      'WORK'
                        ? 'Work'
                        : selectedAddress.type ===
                          'OTHER'
                          ? 'Other'
                          : 'Home'}
                    </Text>
                  </View>

                </View>


                <Text
                  style={
                    styles.addressText
                  }
                >
                  {selectedAddress.addressLine1}

                  {selectedAddress.addressLine2
                    ? `, ${selectedAddress.addressLine2}`
                    : ''}

                  {selectedAddress.landmark
                    ? `, ${selectedAddress.landmark}`
                    : ''}

                  {`, ${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.pincode}`}
                </Text>


                <Text
                  style={
                    styles.phoneText
                  }
                >
                  +91 {selectedAddress.phone}
                </Text>

              </View>

            </View>

          ) : (

            /* =================================================
               NO ADDRESS
            ================================================= */

            <TouchableOpacity
              activeOpacity={0.8}
              style={
                styles.noAddressCard
              }
              onPress={
                handleChangeAddress
              }
            >

              <View
                style={
                  styles.addressIconBg
                }
              >
                <Ionicons
                  name="location-outline"
                  size={22}
                  color="#EAB308"
                />
              </View>


              <View
                style={
                  styles.addressDetails
                }
              >

                <Text
                  style={
                    styles.addressName
                  }
                >
                  Add Delivery Address
                </Text>


                <Text
                  style={
                    styles.addressText
                  }
                >
                  Please select a delivery
                  address to continue.
                </Text>

              </View>


              <Ionicons
                name="chevron-forward"
                size={20}
                color="#9CA3AF"
              />

            </TouchableOpacity>

          )}

        </MotiView>


        {/* =================================================
            COUPON
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
            delay: 200,
          }}
          style={
            styles.sectionContainer
          }
        >

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.couponCard}
            onPress={
              selectedCoupon
                ? undefined
                : openCouponModal
            }
          >

            <View
              style={
                styles.couponLeft
              }
            >

              <MaterialIcons
                name="local-offer"
                size={22}
                color="#10B981"
                style={{
                  marginRight: 12,
                }}
              />

              <Text style={styles.couponText}>
                {selectedCoupon
                  ? `${selectedCoupon.code} Applied`
                  : 'Apply Coupon'}
              </Text>

            </View>


            {selectedCoupon ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleRemoveCoupon}
              >
                <Text style={styles.removeCouponText}>
                  Remove
                </Text>
              </TouchableOpacity>
            ) : (
              <Ionicons
                name="chevron-forward"
                size={20}
                color="#6B7280"
              />
            )}

          </TouchableOpacity>

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
            delay: 300,
          }}
          style={
            styles.sectionContainer
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Bill Details
          </Text>


          <View
            style={
              styles.billContainer
            }
          >

            {/* ITEM TOTAL */}

            <View
              style={styles.billRow}
            >

              <Text
                style={
                  styles.billText
                }
              >
                Item Total ({totalItems}{' '}
                {totalItems === 1
                  ? 'Item'
                  : 'Items'})
              </Text>


              <Text
                style={
                  styles.billValue
                }
              >
                ₹{subtotal.toFixed(2)}
              </Text>

            </View>


            {/* PRODUCT SAVINGS */}

            {totalSavings > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billText}>
                  Your Savings
                </Text>

                <Text
                  style={[
                    styles.billValue,
                    {
                      color: '#10B981',
                    },
                  ]}
                >
                  -₹{totalSavings.toFixed(2)}
                </Text>
              </View>
            )}

            {/* COUPON DISCOUNT */}

            {couponDiscount > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billText}>
                  Coupon Discount
                </Text>

                <Text
                  style={[
                    styles.billValue,
                    {
                      color: '#10B981',
                    },
                  ]}
                >
                  -₹{couponDiscount.toFixed(2)}
                </Text>
              </View>
            )}


            {/* DELIVERY FEE */}

            <View
              style={styles.billRow}
            >

              <Text
                style={
                  styles.billText
                }
              >
                Delivery Fee
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
                FREE
              </Text>

            </View>


            <View
              style={styles.divider}
            />


            {/* GRAND TOTAL */}

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
                ₹{grandTotal.toFixed(2)}
              </Text>

            </View>

          </View>

        </MotiView>


        {/* =================================================
            PAYMENT METHODS
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
          style={
            styles.sectionContainer
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Payment Method
          </Text>


          <View
            style={
              styles.paymentContainer
            }
          >


            {/* =================================================
                UPI
            ================================================= */}

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={true}
              style={[
                styles.paymentOption,
                styles.paymentOptionDisabled,
              ]}
            >

              <View
                style={
                  styles.paymentLeft
                }
              >

                <Ionicons
                  name="qr-code-outline"
                  size={24}
                  color="#9CA3AF"
                />

                <Text
                  style={[
                    styles.paymentText,
                    styles.paymentTextDisabled,
                  ]}
                >
                  UPI (GPay, PhonePe, Paytm)
                </Text>

              </View>


              <View
                style={[
                  styles.radioCircle,
                  styles.radioCircleDisabled,
                ]}
              />

            </TouchableOpacity>


            <View
              style={styles.divider}
            />


            {/* =================================================
                CARD
            ================================================= */}

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={true}
              style={[
                styles.paymentOption,
                styles.paymentOptionDisabled,
              ]}
            >

              <View
                style={
                  styles.paymentLeft
                }
              >

                <Ionicons
                  name="card-outline"
                  size={24}
                  color="#9CA3AF"
                />

                <View style={styles.paymentTextContainer}>
                  <Text
                    style={[
                      styles.paymentText,
                      styles.paymentTextDisabled,
                    ]}
                  >
                    Credit / Debit Card
                  </Text>

                  <Text style={styles.unavailableText}>
                    Temporarily Unavailable
                  </Text>
                </View>

              </View>


              <View
                style={[
                  styles.radioCircle,
                  styles.radioCircleDisabled,
                ]}
              />

            </TouchableOpacity>


            <View
              style={styles.divider}
            />


            {/* =================================================
                COD
            ================================================= */}

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.paymentOption,
                selectedPayment ===
                  'COD' &&
                  styles.paymentOptionActive,
              ]}
              onPress={() =>
                setSelectedPayment(
                  'COD',
                )
              }
            >

              <View
                style={
                  styles.paymentLeft
                }
              >

                <Ionicons
                  name="cash-outline"
                  size={24}
                  color={
                    selectedPayment ===
                    'COD'
                      ? '#EAB308'
                      : '#6B7280'
                  }
                />

                <Text
                  style={[
                    styles.paymentText,
                    selectedPayment ===
                      'COD' &&
                      styles.paymentTextActive,
                  ]}
                >
                  Cash on Delivery
                  (COD)
                </Text>

              </View>


              <View
                style={[
                  styles.radioCircle,
                  selectedPayment ===
                    'COD' &&
                    styles.radioCircleActive,
                ]}
              >
                {selectedPayment ===
                  'COD' && (
                  <View
                    style={
                      styles.radioDot
                    }
                  />
                )}
              </View>

            </TouchableOpacity>

          </View>

        </MotiView>

      </ScrollView>


      {/* =================================================
          BOTTOM PAYMENT BAR
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
            ₹{grandTotal.toFixed(2)}
          </Text>


          <Text
            style={
              styles.checkoutSubText
            }
          >
            VIEW DETAILED BILL
          </Text>

        </View>


        <TouchableOpacity
          style={[
            styles.payBtn,
            placingOrder &&
              styles.payBtnDisabled,
          ]}
          activeOpacity={0.8}
          disabled={placingOrder}
          onPress={
            handlePlaceOrder
          }
        >

          {placingOrder ? (

            <ActivityIndicator
              size="small"
              color="#1F2937"
            />

          ) : (

            <>
              <Text
                style={
                  styles.payBtnText
                }
              >
                Place Order
              </Text>

              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#1F2937"
                style={{
                  marginLeft: 6,
                }}
              />
            </>

          )}

        </TouchableOpacity>

      </MotiView>

      {showCouponModal && (
  <View style={styles.couponOverlay}>
    <View style={styles.couponModal}>
      <View style={styles.couponModalHeader}>
        <View>
          <Text style={styles.couponModalTitle}>
            Coupons & Offers
          </Text>

          <Text style={styles.couponModalSubtitle}>
            Choose the best offer for your order
          </Text>
        </View>

        <TouchableOpacity
          onPress={() =>
            setShowCouponModal(false)
          }
        >
          <Ionicons
            name="close"
            size={26}
            color="#374151"
          />
        </TouchableOpacity>
      </View>

      {couponLoading ? (
        <View
          style={
            styles.couponLoadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color="#EAB308"
          />

          <Text
            style={
              styles.couponLoadingText
            }
          >
            Loading coupons...
          </Text>
        </View>
      ) : coupons.length === 0 ? (
        <View
          style={
            styles.noCouponsContainer
          }
        >
          <MaterialIcons
            name="local-offer"
            size={50}
            color="#D1D5DB"
          />

          <Text
            style={
              styles.noCouponsTitle
            }
          >
            No coupons available
          </Text>

          <Text
            style={
              styles.noCouponsText
            }
          >
            Check back later for new offers.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={{
            paddingBottom: 20,
          }}
        >
          {coupons.map((coupon) => {
            const value =
              Number(coupon.value) || 0;

            const minAmount =
              coupon.minOrderAmount !==
              null &&
              coupon.minOrderAmount !==
                undefined
                ? Number(
                    coupon.minOrderAmount,
                  )
                : 0;

            const maxDiscount =
              coupon.maxDiscount !==
              null &&
              coupon.maxDiscount !==
                undefined
                ? Number(
                    coupon.maxDiscount,
                  )
                : null;

            const isSelected =
              selectedCoupon?.id ===
              coupon.id;

            const eligible =
              subtotal >= minAmount;

            return (
              <View
                key={coupon.id}
                style={[
                  styles.couponOfferCard,
                  isSelected &&
                    styles.couponOfferCardSelected,
                ]}
              >
                <View
                  style={
                    styles.couponOfferTop
                  }
                >
                  <View
                    style={
                      styles.couponOfferCodeBox
                    }
                  >
                    <Text
                      style={
                        styles.couponOfferCode
                      }
                    >
                      {coupon.code}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.couponOfferValue
                    }
                  >
                    {coupon.type ===
                    'PERCENTAGE'
                      ? `${value}% OFF`
                      : `₹${value.toFixed(
                          0,
                        )} OFF`}
                  </Text>
                </View>

                {!!coupon.description && (
                  <Text
                    style={
                      styles.couponOfferDescription
                    }
                  >
                    {coupon.description}
                  </Text>
                )}

                {minAmount > 0 && (
                  <Text
                    style={
                      styles.couponOfferCondition
                    }
                  >
                    Minimum order ₹
                    {minAmount.toFixed(
                      0,
                    )}
                  </Text>
                )}

                {maxDiscount !==
                  null &&
                  coupon.type ===
                    'PERCENTAGE' && (
                    <Text
                      style={
                        styles.couponOfferCondition
                      }
                    >
                      Maximum discount ₹
                      {maxDiscount.toFixed(
                        0,
                      )}
                    </Text>
                  )}

                {!eligible && (
                  <Text
                    style={
                      styles.couponNotEligible
                    }
                  >
                    Add ₹
                    {(
                      minAmount -
                      subtotal
                    ).toFixed(0)}{' '}
                    more to use this coupon
                  </Text>
                )}

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={
                    !eligible ||
                    couponApplying
                  }
                  style={[
                    styles.applyCouponButton,
                    (!eligible ||
                      couponApplying) &&
                      styles.applyCouponButtonDisabled,
                  ]}
                  onPress={() =>
                    handleApplyCoupon(
                      coupon,
                    )
                  }
                >
                  <Text
                    style={
                      styles.applyCouponButtonText
                    }
                  >
                    {isSelected
                      ? 'Applied'
                      : couponApplying
                      ? 'Applying...'
                      : eligible
                      ? 'Apply'
                      : 'Not Eligible'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
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


  // ===================================================
  // LOADING
  // ===================================================

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  errorTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
  },

  errorMessage: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  retryButton: {
    marginTop: 20,
    backgroundColor: '#EAB308',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },

  retryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },

  backToCartButton: {
    marginTop: 12,
    paddingHorizontal: 28,
    paddingVertical: 10,
  },

  backToCartText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },


  // ===================================================
  // HEADER
  // ===================================================

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


  // ===================================================
  // SCROLL
  // ===================================================

  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },


  // ===================================================
  // SECTIONS
  // ===================================================

  sectionContainer: {
    marginBottom: 24,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
  },

  changeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EAB308',
    marginBottom: 12,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },

  noAddressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
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

  addressIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF9C3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  addressDetails: {
    flex: 1,
  },

  addressTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  addressName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginRight: 10,
  },

  tagBadge: {
    backgroundColor: '#EAB308',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },

  tagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },

  addressText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 8,
  },

  phoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },


  // ===================================================
  // COUPON
  // ===================================================

  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#DCFCE7',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },

  couponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  couponText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
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


  // ===================================================
  // PAYMENT
  // ===================================================

  paymentContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },

  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
  },

  paymentOptionActive: {
    backgroundColor: '#FEF9C3',
  },

  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  paymentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },

  paymentTextActive: {
    color: '#1F2937',
    fontWeight: '800',
  },

  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  radioCircleActive: {
    borderColor: '#EAB308',
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EAB308',
  },


  // ===================================================
  // CHECKOUT BAR
  // ===================================================

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

  payBtn: {
    flexDirection: 'row',
    backgroundColor: '#EAB308',
    paddingHorizontal: 24,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  payBtnDisabled: {
    opacity: 0.65,
  },

  payBtnText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '900',
  },

  removeCouponText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
  },

  couponOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    zIndex: 1000,
    elevation: 1000,
  },

  couponModal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 20,
    maxHeight: '82%',
  },

  couponModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 18,
  },

  couponModalTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#1F2937',
  },

  couponModalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },

  couponLoadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  couponLoadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },

  noCouponsContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  noCouponsTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: '800',
    color: '#374151',
  },

  noCouponsText: {
    marginTop: 5,
    fontSize: 13,
    color: '#9CA3AF',
  },

  couponOfferCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
  },

  couponOfferCardSelected: {
    borderColor: '#EAB308',
    backgroundColor: '#FFFBEB',
  },

  couponOfferTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  couponOfferCodeBox: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },

  couponOfferCode: {
    fontSize: 14,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: 0.5,
  },

  couponOfferValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },

  couponOfferDescription: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: '#4B5563',
  },

  couponOfferCondition: {
    marginTop: 7,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },

  couponNotEligible: {
    marginTop: 8,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },

  applyCouponButton: {
    marginTop: 13,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#EAB308',
    alignItems: 'center',
    justifyContent: 'center',
  },

  applyCouponButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },

  applyCouponButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1F2937',
  },

  paymentOptionDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.7,
  },

  paymentTextDisabled: {
    color: '#9CA3AF',
  },

  paymentTextContainer: {
    marginLeft: 12,
    flex: 1,
  },

  unavailableText: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },

  radioCircleDisabled: {
    borderColor: '#D1D5DB',
    backgroundColor: '#F3F4F6',
  },
});