import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar,
  Dimensions,
  ScrollView,
  FlatList,
  LogBox,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

import * as Location from 'expo-location';

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

import {
  login,
  register,
  getMe,
  requestRegisterOtp,
  verifyRegisterOtp,
  requestLoginOtp,
  verifyLoginOtp,
} from '../services/auth.api';

import {
  saveTokens,
  getAccessToken,
  clearTokens,
} from '../services/auth.storage';

import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from '../services/wishlist.api';

import { getCategories } from '../services/category.api';
import type { Category } from '../services/category.api';

import {
  getAvailableCoupons,
} from '../services/coupon.api';

import type {
  Coupon,
} from '../services/coupon.api';

import {
  getProducts,
} from '../services/product.api';

import { addToCart } from '../services/cart.api';

import type {
  Product,
} from '../services/product.api';

LogBox.ignoreLogs(['SafeAreaView has been deprecated', 'Animated: `useNativeDriver`']);

const { width, height } = Dimensions.get('window');
const BANNER_WIDTH = width * 0.92; 
const PRODUCT_CARD_WIDTH = width * 0.38;

let isAppInitialized = false;

// --- DUMMY DATA ---
const SEARCH_WORDS = ['"Snacks"', '"Cold Drinks"', '"Fresh Veggies"', '"Dairy Products"', '"Chocolates"']; 
const BANNERS = [
  { id: '1', color: '#FF9F1C', title: 'Rolls Singh', sub: 'Love At First Bite' },
  { id: '2', color: '#2EC4B6', title: 'Fresh Veggies', sub: 'Farm to Home' },
  { id: '3', color: '#E63946', title: 'Mega Sale', sub: 'Up to 50% OFF' },
];
const CATEGORIES = [
  { id: '1', name: 'Gift & Hampers', icon: '🎁' },
  { id: '2', name: 'Listing in process', icon: '⏳' },
  { id: '3', name: 'South Culture', icon: '🍛' },
  { id: '4', name: 'Momos', icon: '🥟' },
  { id: '5', name: 'Hungry Villa', icon: '🍔' },
  { id: '6', name: 'Jewellery', icon: '💍' },
  { id: '7', name: 'Disposal', icon: '🍽️' },
  { id: '8', name: 'Sweets', icon: '🍩' },
];
const ESSENTIALS = [
  { id: '1', name: 'Fortune Refined Soyabean...', weight: '750g', price: '₹155', discount: '0% OFF', type: 'Add to Cart' },
  { id: '2', name: 'Moong Dal (Dhuli)', weight: '250g', price: '₹30', discount: '0% OFF', type: '3 Options' },
  { id: '3', name: 'Chole (Chick Peas)', weight: '250g', price: '₹35', discount: '0% OFF', type: '3 Options' },
];
const BEST_SELLING = [
  { id: '1', name: 'Monster Zero Sugar Ultra...', weight: '350ml', price: '₹120', discount: '4% OFF', type: 'Add to Cart' },
  { id: '2', name: 'Uttam Sugar Sulphurless...', weight: '1kg', price: '₹75', discount: '0% OFF', type: 'Add to Cart' },
  { id: '3', name: 'Cadbury Temptations...', weight: '70g', price: '₹120', discount: '0% OFF', type: 'Add to Cart' },
];
const HOT_DEALS = [
  { id: '1', name: 'Unibic Cashew Badam...', weight: '450g', price: '₹140', discount: '0% OFF', type: 'Add to Cart' },
  { id: '2', name: 'Red Bull Energy Drink', weight: '250ml', price: '₹125', discount: '0% OFF', type: 'Add to Cart' },
  { id: '3', name: 'Coca-Cola Soft Drink', weight: '750ml', price: '₹40', discount: '0% OFF', type: '3 Options' },
];

type ProductItem = {
  id: string;
  name: string;
  weight: string;
  price: string;
  discount: string;
  type: string;
};

function isValidIconUrl(icon?: string | null): boolean {
  if (!icon) {
    return false;
  }

  return /^https?:\/\/.+/i.test(icon.trim());
}

const mapProductToCard = (
  product: Product,
): ProductItem => {
  const mrp = Number(product.mrp);
  const price = Number(product.price);

  const discount =
    mrp > price && mrp > 0
      ? `${Math.round(((mrp - price) / mrp) * 100)}% OFF`
      : '0% OFF';

  return {
    id: product.id,
    name: product.name,
    weight:
      product.weight ||
      product.unit ||
      '',
    price: `₹${price}`,
    discount,
    type:
      product.stock > 0
        ? 'Add to Cart'
        : 'Out of Stock',
  };
};

const ProductCard = ({
  product,
  index,
  baseDelay = 0,
  onProtectAction,
  onAddToCart,
  onWishlistToggle,
  isWishlisted,
  wishlistLoading,
  cartLoading,
}: {
  product: ProductItem;
  index: number;
  baseDelay?: number;
  onProtectAction: () => any;
  onAddToCart: (productId: string) => void;
  onWishlistToggle: (productId: string) => void;
  isWishlisted: boolean;
  wishlistLoading: boolean;
  cartLoading: boolean;
}) => {

  const router = useRouter();

  return (
    <MotiView 
      key={product.id}
      from={{ opacity: 0, translateX: 50 }} animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', delay: baseDelay + 400 + (index * 100), duration: 500 }}
      style={styles.productCard}
    >
      <View style={styles.cardTopActions}>
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{product.discount}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={() =>
            onWishlistToggle(product.id)
          }
          disabled={wishlistLoading}
          style={styles.heartButton}
        >
          <Feather
            name="heart"
            size={18}
            color={
              isWishlisted
                ? '#EF4444'
                : '#9CA3AF'
            }
            fill={
              isWishlisted
                ? '#EF4444'
                : 'none'
            }
          />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        activeOpacity={0.9} 
        style={styles.productImagePlaceholder} 
        onPress={() => {
          router.push({
            pathname: '/product-details',
            params: {
              id: product.id,
            },
          });
        }}
      >
        <Ionicons name="image-outline" size={36} color="#D1D5DB" />
      </TouchableOpacity>

      <Text style={styles.productWeight}>{product.weight}</Text>
      <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
      <Text style={styles.productPrice}>{product.price}</Text>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.cartButton,
          product.type === '3 Options'
            ? styles.optionsButton
            : null
        ]}
        disabled={cartLoading}
        onPress={() => {
          if (product.type === 'Out of Stock') {
            return;
          }

          if (product.type === '3 Options') {
            router.push({
              pathname: '/product-details',
              params: {
                id: product.id,
              },
            });
            return;
          }

          onAddToCart(product.id);
        }}
      >
        <Text style={styles.cartButtonText}>
          {cartLoading ? 'Adding...' : product.type}
        </Text>
        {product.type === '3 Options' && <Ionicons name="chevron-down" size={14} color="#FFF" style={{marginLeft: 4}} />}
      </TouchableOpacity>
    </MotiView>
  );
};

const AnimatedSplashScreen = () => (
  <MotiView from={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.1 }} transition={{ type: 'timing', duration: 400 }} style={styles.splashContainer}>
    <StatusBar barStyle="dark-content" backgroundColor="#D5EDCC" />
    <MotiView from={{ scale: 0, opacity: 0, translateY: 50 }} animate={{ scale: 1, opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 12, stiffness: 100, delay: 200 }} style={styles.logoCircle}>
      <Ionicons name="location" size={45} color="#F59E0B" />
      <Text style={styles.logoText}>Shope<Text style={{color: '#F59E0B'}}>2</Text>Door</Text>
    </MotiView>
    <MotiText from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 600 }} style={styles.taglineText}>
      Fresh groceries{'\n'}at your doorstep
    </MotiText>
  </MotiView>
);

export default function App() {
  const router = useRouter();
  
  const [showSplash, setShowSplash] = useState(!isAppInitialized);
  const baseDelay = !isAppInitialized ? 2500 : 0;
  const bannerIndexRef = useRef(0);
  const [searchText, setSearchText] = useState('');

  const [isVoiceSearching, setIsVoiceSearching] =
    useState(false);

  const [locationName, setLocationName] =
    useState('Roorkee');

  const [locationLoading, setLocationLoading] =
    useState(false);

  const flatListRef = useRef<FlatList>(null);

  // AUTH STATES
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpExpiresIn, setOtpExpiresIn] = useState<number | null>(
    null,
  );

  const [registerOtpSent, setRegisterOtpSent] = useState(false);
  const [registerOtpLoading, setRegisterOtpLoading] = useState(false);
  const [registerOtp, setRegisterOtp] = useState('');
  const [registerOtpExpiresIn, setRegisterOtpExpiresIn] =
    useState<number | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [regPhone, setRegPhone] = useState('');

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [categoriesLoading, setCategoriesLoading] =
    useState(true);

  const [wishlistState, setWishlistState] = useState<
    Record<string, boolean>
  >({});

  const [wishlistLoading, setWishlistLoading] = useState<
    Record<string, boolean>
  >({});

  const [cartLoading, setCartLoading] = useState<
    Record<string, boolean>
  >({});

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [
    coupons,
    setCoupons,
  ] = useState<Coupon[]>([]);

  const [
    couponsLoading,
    setCouponsLoading,
  ] = useState(true);

  // =====================================================
  // VOICE SEARCH EVENTS
  // =====================================================

  useSpeechRecognitionEvent('start', () => {
    setIsVoiceSearching(true);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsVoiceSearching(false);
  });

  useSpeechRecognitionEvent('result', event => {
    const transcript =
      event.results?.[0]?.transcript?.trim() || '';

    if (transcript) {
      // Whatever user speaks gets written
      // directly into the search box.
      setSearchText(transcript);
    }
  });

  useSpeechRecognitionEvent('error', event => {
    setIsVoiceSearching(false);

    console.log(
      'Speech recognition error:',
      event.error,
      event.message,
    );

    if (event.error !== 'aborted') {
      Alert.alert(
        'Voice Search',
        event.message ||
          'Unable to recognize your voice.',
      );
    }
  });

  const requireLogin = () => {
    if (!isLoggedIn) {
      setAuthMode('login');
      setShowAuthModal(true);
      return false;
    } else {
      return true;
    }
  };

  const handleWishlistToggle = async (
    productId: string,
  ) => {
    if (!requireLogin()) {
      return;
    }

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

  const handleAddToCart = async (productId: string) => {
    if (!requireLogin()) {
      return;
    }

    if (cartLoading[productId]) {
      return;
    }

    try {
      setCartLoading(prev => ({
        ...prev,
        [productId]: true,
      }));

      await addToCart(productId, 1);

      Alert.alert(
        'Added to Cart',
        'Product has been added to your cart.',
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
          : 'Unable to add product to cart. Please try again.',
      );
    } finally {
      setCartLoading(prev => ({
        ...prev,
        [productId]: false,
      }));
    }
  };

  const handleAuthSubmit = async () => {
    if (isSubmitting || registerOtpLoading) return;

    setAuthError('');

    if (authMode !== 'register') {
      return;
    }

    const cleanName = regName.trim();
    const cleanPhone = regPhone.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setAuthError('Please enter your full name.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setAuthError(
        'Please enter a valid 10-digit mobile number.',
      );
      return;
    }

    if (!cleanEmail || !password) {
      setAuthError(
        'Please enter email and password.',
      );
      return;
    }

    try {
      setIsSubmitting(true);

      /*
      * IMPORTANT:
      * Registration OTP must be requested BEFORE
      * creating the actual account.
      */

      const response = await requestRegisterOtp({
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        password,
      });

      setRegisterOtpSent(true);
      setRegisterOtp('');

      if (response.data?.expiresInSeconds) {
        setRegisterOtpExpiresIn(
          response.data.expiresInSeconds,
        );
      }

      if (response.data?.devOtp) {
        Alert.alert(
          'Development OTP',
          `Your OTP is ${response.data.devOtp}`,
        );
      } else {
        Alert.alert(
          'OTP Sent',
          response.message ||
            'OTP sent successfully.',
        );
      }
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : 'Unable to send OTP. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyRegisterOtp = async () => {
    const cleanPhone = regPhone.trim();
    const cleanOtp = registerOtp.trim();

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setAuthError(
        'Please enter a valid 10-digit mobile number.',
      );
      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      setAuthError(
        'Please enter the 6-digit OTP.',
      );
      return;
    }

    try {
      setRegisterOtpLoading(true);
      setAuthError('');

      const response =
        await verifyRegisterOtp(
          cleanPhone,
          cleanOtp,
        );

      const {
        accessToken,
        refreshToken,
        user,
      } = response.data;

      await saveTokens(
        accessToken,
        refreshToken,
      );

      setUserName(
        user.name
          ? user.name.split(' ')[0]
          : 'User',
      );

      setRegisterOtp('');
      setRegisterOtpSent(false);
      setRegisterOtpExpiresIn(null);

      setAuthSuccess(true);

      setTimeout(() => {
        setIsLoggedIn(true);
        setAuthSuccess(false);
        setShowAuthModal(false);
      }, 1500);
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : 'Invalid or expired OTP.',
      );

      Alert.alert(
        'Registration Failed',
        error instanceof Error
          ? error.message
          : 'Invalid or expired OTP.',
      );
    } finally {
      setRegisterOtpLoading(false);
    }
  };


const handleSendOtp = async () => {
  const cleanPhone =
    phone.trim();

  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    Alert.alert(
      'Invalid mobile number',
      'Please enter a valid 10-digit mobile number.',
    );
    return;
  }

  try {
    setOtpLoading(true);
    setAuthError('');

    const response =
      await requestLoginOtp(
        cleanPhone,
      );

    console.log(
      'LOGIN OTP RESPONSE:',
      response,
    );

    setOtp('');
    setOtpSent(true);

    if (
      response.data?.expiresInSeconds
    ) {
      setOtpExpiresIn(
        response.data.expiresInSeconds,
      );
    } else {
      setOtpExpiresIn(300);
    }

    if (response.data?.devOtp) {
      Alert.alert(
        'Development OTP',
        `Your OTP is ${response.data.devOtp}`,
      );
    } else {
      Alert.alert(
        'OTP Sent',
        response.message ||
          'OTP sent successfully.',
      );
    }
  } catch (error: any) {
    console.error(
      'Login OTP request failed:',
      error,
    );

    const message =
      error?.message ||
      'Unable to send OTP. Please try again.';

    setAuthError(message);

    Alert.alert(
      'Unable to send OTP',
      message,
    );
  } finally {
    setOtpLoading(false);
  }
};

const handleVerifyOtp = async () => {
  const cleanPhone =
    phone.trim();

  const cleanOtp =
    otp.trim();

  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    Alert.alert(
      'Invalid mobile number',
      'Please enter a valid 10-digit mobile number.',
    );
    return;
  }

  if (!/^\d{6}$/.test(cleanOtp)) {
    Alert.alert(
      'Invalid OTP',
      'Please enter the 6-digit OTP.',
    );
    return;
  }

  try {
    setOtpLoading(true);
    setAuthError('');

    const response =
      await verifyLoginOtp(
        cleanPhone,
        cleanOtp,
      );

    console.log(
      'LOGIN OTP VERIFY RESPONSE:',
      response,
    );

    const {
      accessToken,
      refreshToken,
      user,
    } = response.data;

    // -----------------------------------------------
    // SAVE SHOP2DOOR SESSION
    // -----------------------------------------------

    await saveTokens(
      accessToken,
      refreshToken,
    );

    // -----------------------------------------------
    // UPDATE UI
    // -----------------------------------------------

    setUserName(
      user.name
        ? user.name.split(' ')[0]
        : 'User',
    );

    setOtp('');
    setOtpSent(false);
    setOtpExpiresIn(null);

    setAuthSuccess(true);

    setTimeout(() => {
      setIsLoggedIn(true);
      setAuthSuccess(false);
      setShowAuthModal(false);
    }, 1500);
  } catch (error: any) {
    console.error(
      'Login OTP verification failed:',
      error,
    );

    const message =
      error?.message ||
      'Invalid or expired OTP.';

    setAuthError(message);

    Alert.alert(
      'OTP Verification Failed',
      message,
    );
  } finally {
    setOtpLoading(false);
  }
};

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const accessToken = await getAccessToken();

        if (!accessToken) {
          return;
        }

        const response = await getMe(accessToken);

        if (response.success && response.data) {
          setIsLoggedIn(true);
          setUserName(
            response.data.name
              ? response.data.name.split(' ')[0]
              : 'User',
          );
        }
      } catch {
        await clearTokens();
        setIsLoggedIn(false);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    const loadWishlist = async () => {
      if (!isLoggedIn) {
        setWishlistState({});
        return;
      }

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

    loadWishlist();
  }, [isLoggedIn]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);

        const response = await getCategories();

        if (response.success && response.data) {
          setCategories(response.data);
        }
      } catch (error) {
          console.log(
            'Failed to load categories:',
            error,
          );
          setCategories([]);
        } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const loadCoupons = async () => {
      try {
        setCouponsLoading(true);

        const accessToken =
          await getAccessToken();

        if (!accessToken) {
          setCoupons([]);
          return;
        }

        const response =
          await getAvailableCoupons();

        if (
          response.success &&
          response.data
        ) {
          setCoupons(
            Array.isArray(
              response.data.coupons,
            )
              ? response.data.coupons
              : [],
          );
        } else {
          setCoupons([]);
        }
      } catch (error) {
        console.log(
          'Failed to load coupons:',
          error,
        );

        setCoupons([]);
      } finally {
        setCouponsLoading(false);
      }
    };

    loadCoupons();
  }, [isLoggedIn]);


  useEffect(() => {
    const loadProducts = async () => {
      try {
        setProductsLoading(true);

        const response = await getProducts({
          page: 1,
          limit: 20,
        });
        console.log('PRODUCTS FETCHED:', response);

        if (
          response.success &&
          response.data
        ) {
          setProducts(
            response.data.products,
          );
        }
      } catch (error) {
        console.log(
          'Failed to load products:',
          error,
        );

        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    if (!isAppInitialized) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        isAppInitialized = true;
      }, 2500); 
      return () => clearTimeout(timer);
    }
  }, []);


  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex =
        (bannerIndexRef.current + 1) % BANNERS.length;

      bannerIndexRef.current = nextIndex;

      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const essentialProducts: ProductItem[] =
  products.length > 0
    ? products
        .slice(0, 3)
        .map(mapProductToCard)
    : [];

const featuredProducts =
  products.filter(
    (product) => product.isFeatured,
  );

const bestSellingProducts: ProductItem[] =
  featuredProducts.length > 0
    ? featuredProducts
        .slice(0, 3)
        .map(mapProductToCard)
    : products.length > 0
      ? products
          .slice(0, 3)
          .map(mapProductToCard)
      : [];

const hotDealProducts: ProductItem[] =
  products.length > 0
    ? [...products]
        .sort(
          (a, b) =>
            Number(b.mrp) -
            Number(b.price) -
            (Number(a.mrp) -
              Number(a.price)),
        )
        .slice(0, 3)
        .map(mapProductToCard)
    : [];

// =====================================================
// PRODUCT SEARCH
// =====================================================

const normalizedSearch =
  searchText.trim().toLowerCase();

const searchResults =
  normalizedSearch.length === 0
    ? []
    : products.filter(product => {
        const productName =
          product.name?.toLowerCase() || '';

        const productSlug =
          product.slug?.toLowerCase() || '';

        return (
          productName.includes(normalizedSearch) ||
          productSlug.includes(normalizedSearch)
        );
      });

// =====================================================
// VOICE SEARCH
// =====================================================

const handleVoiceSearch = async () => {
  try {
    if (isVoiceSearching) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    const permission =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Microphone Permission',
        'Please allow microphone permission to use voice search.',
      );
      return;
    }

    setSearchText('');

    ExpoSpeechRecognitionModule.start({
      lang: 'en-IN',
      interimResults: true,
      continuous: false,
    });
  } catch (error) {
    console.error(
      'Voice search failed:',
      error,
    );

    setIsVoiceSearching(false);

    Alert.alert(
      'Voice Search',
      'Voice search is not available right now.',
    );
  }
};

// =====================================================
// CURRENT LOCATION
// =====================================================

const handleSelectLocation = async () => {
  if (locationLoading) {
    return;
  }

  try {
    setLocationLoading(true);

    const permission =
      await Location.requestForegroundPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert(
        'Location Permission',
        'Please allow location access to detect your current location.',
      );
      return;
    }

    const currentLocation =
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

    const addresses =
      await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

    const address = addresses?.[0];

    const detectedLocation =
      address?.city ||
      address?.district ||
      address?.subregion ||
      address?.region;

    if (detectedLocation) {
      setLocationName(detectedLocation);
    } else {
      setLocationName('Current Location');
    }
  } catch (error) {
    console.error(
      'Location detection failed:',
      error,
    );

    Alert.alert(
      'Location',
      'Unable to detect your current location. Please try again.',
    );
  } finally {
    setLocationLoading(false);
  }
};

const AnimatedSearchPlaceholder = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % SEARCH_WORDS.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <MotiView
      key={SEARCH_WORDS[index]}
      from={{
        opacity: 0,
        translateY: 15,
      }}
      animate={{
        opacity: 1,
        translateY: 0,
      }}
      transition={{
        type: 'timing',
        duration: 400,
      }}
      style={styles.animatedPlaceholder}
      pointerEvents="none"
    >
      <Text style={styles.animatedPlaceholderText}>
        Search{' '}
        <Text style={styles.highlightedSearchText}>
          {SEARCH_WORDS[index]}
        </Text>
      </Text>
    </MotiView>
  );
};

  return (
    <View style={{ flex: 1, backgroundColor: '#FFC529' }}>
      <AnimatePresence>{showSplash && <AnimatedSplashScreen />}</AnimatePresence>

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {!showSplash && !showAuthModal && <StatusBar barStyle="dark-content" backgroundColor="#FFC529" />}
        
        <MotiView from={{ translateY: -50, opacity: 0 }} animate={{ translateY: 0, opacity: 1 }} transition={{ type: 'timing', duration: 600, delay: baseDelay }} style={styles.headerContainer}>
          <View style={styles.topRow}>
            <View style={styles.locationContainer}>
              <Text style={styles.deliverySubText}>Delivery in 10 mins</Text>
              <TouchableOpacity
                style={styles.locationSelector}
                activeOpacity={0.7}
                onPress={handleSelectLocation}
                disabled={locationLoading}
              >
                <Ionicons
                  name="location-sharp"
                  size={20}
                  color="#E63946"
                />

                <Text
                  style={styles.locationText}
                  numberOfLines={1}
                >
                  {locationLoading
                    ? 'Detecting location...'
                    : locationName}
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={18}
                  color="#1F2937"
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.profileBtn} 
              activeOpacity={0.7} 
              onPress={() => {
                if (isLoggedIn) {
                  router.push('/profile');
                  return;
                }

                setAuthMode('login');
                setAuthError('');
                setShowAuthModal(true);
              }}
            >
              <Text style={styles.loginText} numberOfLines={1}>{isLoggedIn ? `Hi, ${userName}` : 'Login'}</Text>
              <View style={styles.profileIconCircle}><Ionicons name="person" size={14} color="#FFF" /></View>
            </TouchableOpacity>
          </View>

          <MotiView from={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: baseDelay + 200, damping: 15 }} style={styles.searchWrapper}>
            <Feather name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <View style={styles.searchInputContainer}>
              {searchText === '' && <AnimatedSearchPlaceholder />}
              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
                autoCorrect
                autoCapitalize="none"
              />
            </View>
            <View style={styles.divider} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleVoiceSearch}
                style={[
                  styles.voiceButton,
                  isVoiceSearching &&
                    styles.voiceButtonActive,
                ]}
              >
                <Ionicons
                  name={
                    isVoiceSearching
                      ? 'mic'
                      : 'mic-outline'
                  }
                  size={22}
                  color={
                    isVoiceSearching
                      ? '#EF4444'
                      : '#FF6B6B'
                  }
                />
              </TouchableOpacity>
          </MotiView>
        </MotiView>

        {searchText.trim().length > 0 ? (
        <View style={styles.searchResultsContainer}>

          {productsLoading ? (
            <View style={styles.searchMessageContainer}>
              <Text style={styles.searchMessageTitle}>
                Searching products...
              </Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.searchMessageContainer}>
              <Ionicons
                name="search-outline"
                size={48}
                color="#D1D5DB"
              />

              <Text style={styles.searchMessageTitle}>
                Product not available
              </Text>

              <Text style={styles.searchMessageSubtitle}>
                We couldn't find "{searchText.trim()}".
                Try another product name.
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.searchResultsContent}
            >
              <Text style={styles.searchResultsTitle}>
                Search Results
              </Text>

              <Text style={styles.searchResultsSubtitle}>
                {searchResults.length} product
                {searchResults.length > 1 ? 's' : ''} found
              </Text>

              <View style={styles.searchProductGrid}>
                {searchResults.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={mapProductToCard(product)}
                    index={index}
                    baseDelay={0}
                    onProtectAction={requireLogin}
                    onAddToCart={handleAddToCart}
                    onWishlistToggle={handleWishlistToggle}
                    isWishlisted={
                      wishlistState[product.id] === true
                    }
                    wishlistLoading={
                      wishlistLoading[product.id] === true
                    }
                    cartLoading={
                      cartLoading[product.id] === true
                    }
                  />
                ))}
              </View>
            </ScrollView>
          )}

        </View>
      ) : (
        <ScrollView 
          style={styles.contentContainer} 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ 
            paddingBottom: height * 0.15 
          }}
        >
          
          {/* BANNERS */}
          <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: baseDelay + 300 }}>
            <FlatList ref={flatListRef} data={BANNERS} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(item) => item.id} snapToInterval={width} snapToAlignment="center" decelerationRate="fast" contentContainerStyle={styles.bannerScrollContent} renderItem={({ item }) => (
                <View style={styles.bannerWrapper}>
                  <TouchableOpacity activeOpacity={0.9} style={[styles.bannerCard, { backgroundColor: item.color }]}>
                     <Text style={styles.bannerTitle}>{item.title}</Text>
                     <Text style={styles.bannerSub}>{item.sub}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </MotiView>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat, index) => (
                <MotiView key={cat.id} from={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', delay: baseDelay + 300 + (index * 50) }} style={styles.categoryItem}>

                  <TouchableOpacity 
                    activeOpacity={0.7} 
                    style={styles.categoryIconCircle} 
                    onPress={() => 
                      router.push({ 
                        pathname: '/category-details', 
                        params: { 
                          slug: cat.slug,
                        },
                      })
                    }
                  >
                    {isValidIconUrl(cat.icon) ? (
                      <SvgUri
                        uri={cat.icon!.trim()}
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
                  <Text style={styles.categoryName} numberOfLines={2}>{cat.name}</Text>
                </MotiView>
              ))}
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Everyday Essentials</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollPadding}>
              {essentialProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                baseDelay={baseDelay}
                onProtectAction={requireLogin}
                onAddToCart={handleAddToCart}
                onWishlistToggle={handleWishlistToggle}
                isWishlisted={wishlistState[product.id] === true}
                wishlistLoading={
                  wishlistLoading[product.id] === true
                }
                cartLoading={
                  cartLoading[product.id] === true
                }
              />
            ))}
            </ScrollView>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Coupons & Offers</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollPadding}>
              {couponsLoading ? (
                <View
                  style={{
                    width: width * 0.65,
                    height: 110,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#6B7280',
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    Loading offers...
                  </Text>
                </View>
              ) : coupons.length > 0 ? (
                coupons.map((coupon) => {
                  const value =
                    Number(coupon.value) || 0;

                  return (
                    <TouchableOpacity
                      key={coupon.id}
                      activeOpacity={0.8}
                      style={[
                        styles.couponCard,
                        {
                          backgroundColor:
                            '#FEF3C7',
                        },
                      ]}
                      onPress={() => {
                        if (requireLogin()) {
                          router.push('/checkout');
                        }
                      }}
                    >
                      <Text
                        style={styles.couponCode}
                      >
                        {coupon.code}
                      </Text>

                      <Text
                        style={styles.couponDesc}
                        numberOfLines={2}
                      >
                        {coupon.description ||
                          (coupon.type ===
                          'PERCENTAGE'
                            ? `${value}% OFF`
                            : `₹${value.toFixed(
                                0,
                              )} OFF`)}
                      </Text>

                      <View
                        style={
                          styles.couponDashedLine
                        }
                      />
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View
                  style={{
                    paddingHorizontal: width * 0.04,
                  }}
                >
                  <Text
                    style={{
                      color: '#9CA3AF',
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    No offers available right now
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Best Selling</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollPadding}>
              {bestSellingProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  baseDelay={baseDelay}
                  onProtectAction={requireLogin}
                  onAddToCart={handleAddToCart}
                  onWishlistToggle={handleWishlistToggle}
                  isWishlisted={wishlistState[product.id] === true}
                  wishlistLoading={
                    wishlistLoading[product.id] === true
                  }
                  cartLoading={
                    cartLoading[product.id] === true
                  }
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Hot Deals</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollPadding}>
              {hotDealProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  baseDelay={baseDelay}
                  onProtectAction={requireLogin}
                  onAddToCart={handleAddToCart}
                  onWishlistToggle={handleWishlistToggle}
                  isWishlisted={wishlistState[product.id] === true}
                  wishlistLoading={
                    wishlistLoading[product.id] === true
                  }
                  cartLoading={
                    cartLoading[product.id] === true
                  }
                />
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      )
    }

        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}><Ionicons name="home" size={24} color="#EAB308" /><View style={styles.activeNavDot} /></TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/categories')}><Ionicons name="grid-outline" size={24} color="#9CA3AF" /></TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/cart')}> 
            <Feather name="shopping-bag" size={24} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/wishlist')}><Feather name="heart" size={24} color="#9CA3AF" /></TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* FIX: PERFECT BLUR OVERLAY & KEYBOARD HANDLING */}
      <AnimatePresence>
        {showAuthModal && (
          <MotiView 
            from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            transition={{ type: 'timing', duration: 300 }} 
            style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 999 }]} 
          >
            {/* Blur Effect */}
            <BlurView intensity={50} tint="dark" style={styles.blurContainer}>
              
              <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                style={{ width: '100%', alignItems: 'center' }}
              >
                <MotiView 
                  from={{ translateY: 200, scale: 0.9 }} animate={{ translateY: 0, scale: 1 }} exit={{ translateY: 400, scale: 0.8 }} 
                  transition={{ type: 'spring', damping: 18 }} 
                  style={styles.modalBox}
                >
                  {!authSuccess && (
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => {
                        setShowAuthModal(false);
                        setAuthError('');
                        setOtp('');
                        setOtpSent(false);
                        setOtpExpiresIn(null);
                        setRegisterOtp('');
                        setRegisterOtpSent(false);
                        setRegisterOtpExpiresIn(null);
                      }}>
                      <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                  )}

                  {authSuccess ? (
                    <View style={styles.successState}>
                      <MotiView from={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 100 }} style={styles.successCircle}>
                        <Ionicons name="checkmark" size={50} color="#FFF" />
                      </MotiView>
                      <Text style={styles.successTitle}>
                        {authMode === 'login' ? 'Login Successful!' : 'Account Created!'}
                      </Text>
                      <Text style={styles.successSub}>Getting things ready for you...</Text>
                    </View>
                  ) : (
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{
                        flexGrow: 1,
                        paddingBottom: 20,
                      }}
                      keyboardShouldPersistTaps="handled"
                    >
                      <Text style={styles.modalTitle}>
                        {authMode === 'login'
                          ? 'Welcome Back!'
                          : 'Create Account'}
                      </Text>

                      <Text style={styles.modalSub}>
                        {authMode === 'login'
                          ? 'Login with your registered mobile number'
                          : 'Join us for fresh groceries'}
                      </Text>

                      {authMode === 'login' ? (
                        <>
                          <TextInput
                            style={styles.inputField}
                            placeholder="Mobile Number"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={phone}
                            onChangeText={(value) => {
                              setPhone(value.replace(/\D/g, ''));
                              setAuthError('');
                            }}
                            editable={!otpLoading}
                          />

                          {!otpSent && (
                            <TouchableOpacity
                              style={[
                                styles.primaryAuthBtn,
                                otpLoading && { opacity: 0.6 },
                              ]}
                              onPress={handleSendOtp}
                              activeOpacity={0.8}
                              disabled={otpLoading}
                            >
                              <Text style={styles.primaryAuthBtnText}>
                                {otpLoading ? 'Sending OTP...' : 'Send OTP'}
                              </Text>
                            </TouchableOpacity>
                          )}

                          {otpSent && (
                            <>
                              <TextInput
                                style={styles.inputField}
                                placeholder="Enter 6-digit OTP"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="number-pad"
                                maxLength={6}
                                value={otp}
                                onChangeText={(value) => {
                                  setOtp(value.replace(/\D/g, ''));
                                  setAuthError('');
                                }}
                                editable={!otpLoading}
                              />

                              <TouchableOpacity
                                style={[
                                  styles.primaryAuthBtn,
                                  otpLoading && { opacity: 0.6 },
                                ]}
                                onPress={handleVerifyOtp}
                                activeOpacity={0.8}
                                disabled={otpLoading}
                              >
                                <Text style={styles.primaryAuthBtnText}>
                                  {otpLoading
                                    ? 'Verifying...'
                                    : 'Verify & Login'}
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={{
                                  alignItems: 'center',
                                  marginTop: 12,
                                }}
                                onPress={() => {
                                  setOtp('');
                                  setOtpSent(false);
                                  setOtpExpiresIn(null);
                                  setAuthError('');
                                }}
                                disabled={otpLoading}
                              >
                                <Text
                                  style={{
                                    color: '#6B7280',
                                    fontSize: 13,
                                    fontWeight: '600',
                                  }}
                                >
                                  Change mobile number
                                </Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <TextInput
                            style={styles.inputField}
                            placeholder="Full Name (e.g. Yash Chaurasia)"
                            placeholderTextColor="#9CA3AF"
                            value={regName}
                            onChangeText={(value) => {
                              setRegName(value);
                              setAuthError('');
                            }}
                            editable={!registerOtpSent && !registerOtpLoading}
                          />

                          <TextInput
                            style={styles.inputField}
                            placeholder="Phone No."
                            placeholderTextColor="#9CA3AF"
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={regPhone}
                            onChangeText={(value) => {
                              setRegPhone(value.replace(/\D/g, ''));
                              setAuthError('');
                            }}
                            editable={!registerOtpSent && !registerOtpLoading}
                          />

                          <TextInput
                            style={styles.inputField}
                            placeholder="Email ID"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={(value) => {
                              setEmail(value);
                              setAuthError('');
                            }}
                            editable={!registerOtpSent && !registerOtpLoading}
                          />

                          <View style={styles.passwordContainer}>
                            <TextInput
                              style={styles.passwordInput}
                              placeholder="Password"
                              placeholderTextColor="#9CA3AF"
                              secureTextEntry={!showPassword}
                              value={password}
                              onChangeText={(value) => {
                                setPassword(value);
                                setAuthError('');
                              }}
                              editable={!registerOtpSent && !registerOtpLoading}
                            />

                            <TouchableOpacity
                              onPress={() => setShowPassword(!showPassword)}
                              style={styles.eyeIcon}
                              disabled={registerOtpSent || registerOtpLoading}
                            >
                              <Feather
                                name={showPassword ? 'eye' : 'eye-off'}
                                size={20}
                                color="#9CA3AF"
                              />
                            </TouchableOpacity>
                          </View>

                          {!registerOtpSent && (
                            <TouchableOpacity
                              style={[
                                styles.primaryAuthBtn,
                                isSubmitting && { opacity: 0.6 },
                              ]}
                              onPress={handleAuthSubmit}
                              activeOpacity={0.8}
                              disabled={isSubmitting}
                            >
                              <Text style={styles.primaryAuthBtnText}>
                                {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
                              </Text>
                            </TouchableOpacity>
                          )}

                          {registerOtpSent && (
                            <>
                              <TextInput
                                style={styles.inputField}
                                placeholder="Enter 6-digit OTP"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="number-pad"
                                maxLength={6}
                                value={registerOtp}
                                onChangeText={(value) => {
                                  setRegisterOtp(value.replace(/\D/g, ''));
                                  setAuthError('');
                                }}
                                editable={!registerOtpLoading}
                                autoFocus
                              />

                              <TouchableOpacity
                                style={[
                                  styles.primaryAuthBtn,
                                  registerOtpLoading && { opacity: 0.6 },
                                ]}
                                onPress={handleVerifyRegisterOtp}
                                activeOpacity={0.8}
                                disabled={registerOtpLoading}
                              >
                                <Text style={styles.primaryAuthBtnText}>
                                  {registerOtpLoading
                                    ? 'Creating Account...'
                                    : 'Verify & Create Account'}
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={{
                                  alignItems: 'center',
                                  marginTop: 12,
                                }}
                                onPress={() => {
                                  setRegisterOtp('');
                                  setRegisterOtpSent(false);
                                  setRegisterOtpExpiresIn(null);
                                  setAuthError('');
                                }}
                                disabled={registerOtpLoading}
                              >
                                <Text
                                  style={{
                                    color: '#6B7280',
                                    fontSize: 13,
                                    fontWeight: '600',
                                  }}
                                >
                                  Change mobile number
                                </Text>
                              </TouchableOpacity>

                              {registerOtpExpiresIn !== null && (
                                <Text
                                  style={{
                                    textAlign: 'center',
                                    color: '#6B7280',
                                    fontSize: 12,
                                    marginTop: 10,
                                  }}
                                >
                                  OTP expires in {registerOtpExpiresIn} seconds
                                </Text>
                              )}
                            </>
                          )}
                        </>
                      )}

                      {authError !== '' && (
                        <Text
                          style={{
                            color: '#DC2626',
                            fontSize: 13,
                            marginTop: 12,
                            marginBottom: 4,
                            fontWeight: '600',
                            textAlign:
                              authMode === 'login'
                                ? 'center'
                                : 'left',
                          }}
                        >
                          {authError}
                        </Text>
                      )}

                      <View style={styles.toggleAuthMode}>
                        <Text style={styles.authToggleText}>
                          {authMode === 'login'
                            ? "Don't have an account? "
                            : 'Already have an account? '}
                        </Text>

                        <TouchableOpacity
                          onPress={() => {
                            setAuthMode(
                              authMode === 'login'
                                ? 'register'
                                : 'login',
                            );
                            setAuthError('');
                            setOtp('');
                            setOtpSent(false);
                            setOtpExpiresIn(null);
                            setRegisterOtp('');
                            setRegisterOtpSent(false);
                            setRegisterOtpExpiresIn(null);
                          }}
                        >
                          <Text style={styles.authToggleLink}>
                            {authMode === 'login'
                              ? 'Create an account'
                              : 'Login here'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                  )}
                </MotiView>
              </KeyboardAvoidingView>
            </BlurView>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#D5EDCC', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  logoCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 10 },
  logoText: { fontSize: 16, fontWeight: '800', color: '#2F855A', marginTop: 2 },
  taglineText: { marginTop: 30, fontSize: 18, fontWeight: '700', color: '#2F855A', textAlign: 'center', lineHeight: 26 },

  safeArea: { flex: 1 },
  headerContainer: { backgroundColor: '#FFC529', paddingHorizontal: width * 0.04, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8, zIndex: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  locationContainer: { flex: 1, paddingRight: 15 },
  deliverySubText: { fontSize: 11, fontWeight: '800', color: '#E63946', textTransform: 'uppercase', marginBottom: 4 },
  locationSelector: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginHorizontal: 6, maxWidth: '80%' },
  profileBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.4)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  loginText: { fontSize: 13, fontWeight: '700', color: '#1F2937', marginRight: 6, maxWidth: 85 },
  profileIconCircle: { backgroundColor: '#1F2937', borderRadius: 15, padding: 4 },
  
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 16, height: 50, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  searchIcon: { marginRight: 10 },
  searchInputContainer: { flex: 1, justifyContent: 'center', height: '100%' },
  animatedPlaceholder: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center' },
  animatedPlaceholderText: { fontSize: 15, color: '#9CA3AF', fontWeight: '500' },
  highlightedSearchText: { color: '#1F2937', fontWeight: '700' }, 
  searchInput: { flex: 1, fontSize: 15, color: '#1F2937', fontWeight: '500', height: '100%' },
  divider: { width: 1, height: '50%', backgroundColor: '#E5E7EB', marginHorizontal: 12 },
  
  contentContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  
  bannerScrollContent: { paddingTop: 20, paddingBottom: 10 },
  bannerWrapper: { width: width, alignItems: 'center' },
  bannerCard: { width: BANNER_WIDTH, height: 140, borderRadius: 20, padding: 20, justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 5 },
  bannerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 4 },
  bannerSub: { fontSize: 14, fontWeight: '600', color: '#FFF' },

  sectionContainer: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 16, paddingHorizontal: width * 0.04 },
  horizontalScrollPadding: { paddingHorizontal: width * 0.04, paddingBottom: 10 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: width * 0.04 },
  categoryItem: { width: '22%', alignItems: 'center', marginBottom: 20 },
  categoryIconCircle: { width: 65, height: 65, borderRadius: 35, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3, marginBottom: 8 },
  emojiIcon: { fontSize: 30 },
  categoryName: { fontSize: 11, fontWeight: '600', color: '#4B5563', textAlign: 'center' },

  productCard: { width: PRODUCT_CARD_WIDTH, backgroundColor: '#FFF', borderRadius: 16, padding: 12, marginRight: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTopActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  discountBadge: { backgroundColor: '#2E7D32', paddingVertical: 4, paddingHorizontal: 6, borderBottomRightRadius: 8, borderTopLeftRadius: 8, marginLeft: -12, marginTop: -12 },
  discountText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  productImagePlaceholder: { height: 80, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  productWeight: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginBottom: 4 },
  productName: { fontSize: 13, fontWeight: '700', color: '#1F2937', marginBottom: 8, minHeight: 36, lineHeight: 18 },
  productPrice: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 12 },
  cartButton: { backgroundColor: '#EAB308', flexDirection: 'row', paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  optionsButton: { backgroundColor: '#65A30D' }, 
  cartButtonText: { color: '#FFF', fontWeight: '700', fontSize: 12 },

  couponCard: { width: width * 0.65, borderRadius: 12, padding: 16, marginRight: 16, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  couponCode: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 4 },
  couponDesc: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  couponDashedLine: { position: 'absolute', left: -8, top: '50%', width: 16, height: 16, borderRadius: 8, backgroundColor: '#F9FAFB' }, 

  bottomNav: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 12, paddingBottom: 25, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 15, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  navItem: { alignItems: 'center', justifyContent: 'center', width: 50, height: 40 },
  activeNavDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#EAB308', position: 'absolute', bottom: -2 },

  blurContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { width: '100%', maxHeight: height * 0.85, flexShrink: 1, backgroundColor: '#FFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 25 },
  modalCloseBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 4 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#1F2937', marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  
  inputField: { width: '100%', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 15, color: '#1F2937', marginBottom: 12 },
  
  passwordContainer: { width: '100%', position: 'relative', marginBottom: 24 },
  passwordInput: { width: '100%', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingLeft: 16, paddingRight: 45, height: 50, fontSize: 15, color: '#1F2937' },
  eyeIcon: { position: 'absolute', right: 15, top: 15, zIndex: 5 },
  
  primaryAuthBtn: { width: '100%', backgroundColor: '#EAB308', height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: '#EAB308', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  primaryAuthBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  
  toggleAuthMode: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  authToggleText: { color: '#6B7280', fontSize: 14 },
  authToggleLink: { color: '#EAB308', fontSize: 14, fontWeight: '700' },

  successState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  successCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 8 },
  successSub: { fontSize: 14, color: '#6B7280' },

  heartButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

    voiceButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },

  voiceButtonActive: {
    backgroundColor: '#FEE2E2',
  },

    searchResultsContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  searchResultsContent: {
    paddingHorizontal: width * 0.04,
    paddingTop: 20,
    paddingBottom: height * 0.15,
  },

  searchResultsTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1F2937',
  },

  searchResultsSubtitle: {
    marginTop: 4,
    marginBottom: 16,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },

  searchProductGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  searchMessageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  searchMessageTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
  },

  searchMessageSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
    textAlign: 'center',
  },
});