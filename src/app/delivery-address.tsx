import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';

import {
  Address,
  AddressType,
  CreateAddressPayload,
  UpdateAddressPayload,
  createAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../services/address.api';

const { height } = Dimensions.get('window');

type AddressForm = {
  type: AddressType;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
};

const EMPTY_FORM: AddressForm = {
  type: 'HOME',
  name: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
};

export default function DeliveryAddressScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    returnTo?: string;
    addressId?: string;
  }>();

  const [showModal, setShowModal] = useState(false);

  const [addresses, setAddresses] = useState<Address[]>([]);

  const [selectedAddressId, setSelectedAddressId] = useState(
    params.addressId ?? '',
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [defaultingAddressId, setDefaultingAddressId] = useState<string | null>(null);

  const [editingAddressId, setEditingAddressId] = useState<string | null>(
    null,
  );

  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);

  // =====================================================
  // LOAD ADDRESSES
  // =====================================================

  const loadAddresses = useCallback(async () => {
    try {
      setLoading(true);

      const response = await getAddresses();

      const loadedAddresses = response.data.addresses ?? [];

      setAddresses(loadedAddresses);

      // If checkout sent an addressId, keep it selected.
      // Otherwise select default address automatically.
      if (params.addressId) {
        const exists = loadedAddresses.some(
          (address) => address.id === params.addressId,
        );

        if (exists) {
          setSelectedAddressId(params.addressId);
          return;
        }
      }

      const defaultAddress = loadedAddresses.find(
        (address) => address.isDefault,
      );

      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      } else if (loadedAddresses.length > 0) {
        setSelectedAddressId(loadedAddresses[0].id);
      }
    } catch (error: any) {
      console.error('Address loading error:', error);

      Alert.alert(
        'Unable to load addresses',
        error?.message || 'Something went wrong.',
      );
    } finally {
      setLoading(false);
    }
  }, [params.addressId]);

  // Load when screen opens.
  React.useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // =====================================================
  // FORM HELPERS
  // =====================================================

  const updateForm = (
    field: keyof AddressForm,
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingAddressId(null);
  };

  // =====================================================
  // OPEN ADD ADDRESS
  // =====================================================

  const handleAddAddress = () => {
    resetForm();
    setShowModal(true);
  };

  // =====================================================
  // OPEN EDIT ADDRESS
  // =====================================================

  const handleEditAddress = (address: Address) => {
    setEditingAddressId(address.id);

    setForm({
      type: address.type,
      name: address.name,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? '',
      landmark: address.landmark ?? '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
    });

    setShowModal(true);
  };

  // =====================================================
  // VALIDATE FORM
  // =====================================================

  const validateForm = () => {
    if (!form.name.trim()) {
      Alert.alert('Missing information', 'Please enter your name.');
      return false;
    }

    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      Alert.alert(
        'Invalid phone number',
        'Please enter a valid 10-digit Indian mobile number.',
      );
      return false;
    }

    if (!form.addressLine1.trim()) {
      Alert.alert(
        'Missing information',
        'Please enter your full address.',
      );
      return false;
    }

    if (!form.city.trim()) {
      Alert.alert('Missing information', 'Please enter your city.');
      return false;
    }

    if (!form.state.trim()) {
      Alert.alert('Missing information', 'Please enter your state.');
      return false;
    }

    if (!/^\d{6}$/.test(form.pincode.trim())) {
      Alert.alert(
        'Invalid pincode',
        'Please enter a valid 6-digit pincode.',
      );
      return false;
    }

    return true;
  };

  // =====================================================
  // SAVE / UPDATE ADDRESS
  // =====================================================

  const handleSaveAddress = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      if (editingAddressId) {
        const payload: UpdateAddressPayload = {
          type: form.type,
          name: form.name.trim(),
          phone: form.phone.trim(),
          addressLine1: form.addressLine1.trim(),
          addressLine2: form.addressLine2.trim() || undefined,
          landmark: form.landmark.trim() || undefined,
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
        };

        const response = await updateAddress(
          editingAddressId,
          payload,
        );

        const updatedAddress = response.data;

        setAddresses((previous) =>
          previous.map((address) =>
            address.id === updatedAddress.id
              ? updatedAddress
              : address,
          ),
        );

        setSelectedAddressId(updatedAddress.id);

        setShowModal(false);
        resetForm();
        Keyboard.dismiss();

        Alert.alert(
          'Address updated',
          'Your delivery address has been updated successfully.',
        );
      } else {
        const payload: CreateAddressPayload = {
          type: form.type,
          name: form.name.trim(),
          phone: form.phone.trim(),
          addressLine1: form.addressLine1.trim(),
          addressLine2: form.addressLine2.trim() || undefined,
          landmark: form.landmark.trim() || undefined,
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          isDefault: addresses.length === 0,
        };

        const response = await createAddress(payload);

        const newAddress = response.data;

        setAddresses((previous) => [
          newAddress,
          ...previous,
        ]);

        setSelectedAddressId(newAddress.id);

        setShowModal(false);
        resetForm();
        Keyboard.dismiss();

        Alert.alert(
          'Address saved',
          'Your delivery address has been saved successfully.',
        );
      }
    } catch (error: any) {
      console.error('Address save error:', error);

      Alert.alert(
        editingAddressId
          ? 'Unable to update address'
          : 'Unable to save address',
        error?.message || 'Something went wrong.',
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // SELECT ADDRESS
  // =====================================================

  const handleSelectAddress = (address: Address) => {
    if (deletingAddressId || defaultingAddressId) {
      return;
    }

    setSelectedAddressId(address.id);
  };

  // =====================================================
  // SET DEFAULT ADDRESS
  // =====================================================

  const handleSetDefaultAddress = async (address: Address) => {
    if (address.isDefault || defaultingAddressId || deletingAddressId) {
      return;
    }

    try {
      setDefaultingAddressId(address.id);

      await setDefaultAddress(address.id);

      // Reload from backend so default state stays fully in sync.
      await loadAddresses();
      setSelectedAddressId(address.id);
    } catch (error: any) {
      console.error('Set default address error:', error);

      Alert.alert(
        'Unable to set default',
        'We could not make this your default address. Please try again.',
      );
    } finally {
      setDefaultingAddressId(null);
    }
  };

  // =====================================================
  // DELETE ADDRESS
  // =====================================================

  const handleDeleteAddress = (address: Address) => {
    if (deletingAddressId || defaultingAddressId) {
      return;
    }

    Alert.alert(
      'Delete address?',
      'This delivery address will be permanently removed.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingAddressId(address.id);

              await deleteAddress(address.id);

              // Reload from backend to handle default-address changes correctly.
              await loadAddresses();

              setSelectedAddressId((currentSelectedId) =>
                currentSelectedId === address.id ? '' : currentSelectedId,
              );
            } catch (error: any) {
              console.error('Delete address error:', error);

              Alert.alert(
                'Unable to delete address',
                'We could not delete this address. Please try again.',
              );
            } finally {
              setDeletingAddressId(null);
            }
          },
        },
      ],
    );
  };

  // =====================================================
  // CONTINUE TO CHECKOUT
  // =====================================================

  const handleContinue = () => {
    if (!selectedAddressId) {
      Alert.alert(
        'Select delivery address',
        'Please select a delivery address to continue.',
      );
      return;
    }

    if (params.returnTo === 'checkout') {
      router.replace({
        pathname: '/checkout',
        params: {
          addressId: selectedAddressId,
        },
      });

      return;
    }

    router.back();
  };

  // =====================================================
  // RENDER ADDRESS
  // =====================================================

  const renderAddressCard = (
    address: Address,
    index: number,
  ) => {
    const isSelected =
      selectedAddressId === address.id;

    const addressTypeLabel =
      address.type === 'WORK'
        ? 'Work'
        : address.type === 'OTHER'
          ? 'Other'
          : 'Home';

    const addressIcon =
      address.type === 'WORK'
        ? 'briefcase-outline'
        : address.type === 'OTHER'
          ? 'location-outline'
          : 'home-outline';

    return (
      <MotiView
        key={address.id}
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
          delay: index * 80,
        }}
        style={[
          styles.addressCard,
          isSelected && styles.addressCardSelected,
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleSelectAddress(address)}
        >
          <View style={styles.cardTop}>
            <View
              style={[
                styles.tagBadge,
                isSelected && styles.tagBadgeSelected,
              ]}
            >
              <Ionicons
                name={addressIcon as any}
                size={13}
                color="#FFF"
              />

              <Text style={styles.tagText}>
                {addressTypeLabel}
              </Text>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.editButton}
                onPress={() =>
                  handleEditAddress(address)
                }
                disabled={
                  !!deletingAddressId ||
                  !!defaultingAddressId
                }
              >
                <Feather
                  name="edit-2"
                  size={16}
                  color="#6B7280"
                />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.deleteButton}
                onPress={() =>
                  handleDeleteAddress(address)
                }
                disabled={
                  !!deletingAddressId ||
                  !!defaultingAddressId
                }
              >
                {deletingAddressId === address.id ? (
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

              <View
                style={[
                  styles.radioCircle,
                  isSelected &&
                    styles.radioCircleSelected,
                ]}
              >
                {isSelected && (
                  <View style={styles.radioDot} />
                )}
              </View>
            </View>
          </View>

          <Text style={styles.cardName}>
            {address.name}
          </Text>

          <Text style={styles.cardAddress}>
            {address.addressLine1}
            {address.addressLine2
              ? `, ${address.addressLine2}`
              : ''}
            {address.landmark
              ? `, ${address.landmark}`
              : ''}
            {`, ${address.city}, ${address.state} - ${address.pincode}`}
          </Text>

          <Text style={styles.cardMobile}>
            {address.phone}
          </Text>

          {!address.isDefault && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.setDefaultButton}
              onPress={() =>
                handleSetDefaultAddress(address)
              }
              disabled={
                !!deletingAddressId ||
                !!defaultingAddressId
              }
            >
              {defaultingAddressId === address.id ? (
                <ActivityIndicator
                  size="small"
                  color="#65A30D"
                />
              ) : (
                <Text style={styles.setDefaultText}>
                  Set as default
                </Text>
              )}
            </TouchableOpacity>
          )}

          {address.isDefault && (
            <View style={styles.defaultRow}>
              <Ionicons
                name="checkmark-circle"
                size={15}
                color="#10B981"
              />
              <Text style={styles.defaultText}>
                Default address
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </MotiView>
    );
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#FFF',
      }}
    >
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'left', 'right']}
      >
        {!showModal && (
          <StatusBar
            barStyle="dark-content"
            backgroundColor="#FFF"
          />
        )}

        {/* =====================================================
            HEADER
        ===================================================== */}

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

          <Text style={styles.headerTitle}>
            Delivery Address
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* =====================================================
            ADD NEW ADDRESS
        ===================================================== */}

        <TouchableOpacity
          style={styles.addBtnContainer}
          activeOpacity={0.7}
          onPress={handleAddAddress}
        >
          <Feather
            name="plus"
            size={20}
            color="#65A30D"
          />

          <Text style={styles.addBtnText}>
            Add New Address
          </Text>
        </TouchableOpacity>

        {/* =====================================================
            ADDRESS LIST
        ===================================================== */}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color="#EAB308"
            />

            <Text style={styles.loadingText}>
              Loading addresses...
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.listContainer,
              addresses.length === 0 &&
                styles.emptyListContainer,
            ]}
            showsVerticalScrollIndicator={false}
          >
            {addresses.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons
                    name="location-outline"
                    size={42}
                    color="#D1D5DB"
                  />
                </View>

                <Text style={styles.emptyStateTitle}>
                  No addresses found
                </Text>

                <Text style={styles.emptyStateText}>
                  Add a delivery address to continue
                  with your order.
                </Text>

                <TouchableOpacity
                  style={styles.emptyAddButton}
                  activeOpacity={0.8}
                  onPress={handleAddAddress}
                >
                  <Feather
                    name="plus"
                    size={18}
                    color="#FFF"
                  />

                  <Text style={styles.emptyAddButtonText}>
                    Add Address
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              addresses.map(renderAddressCard)
            )}
          </ScrollView>
        )}

        {/* =====================================================
            CONTINUE BUTTON
        ===================================================== */}

        {addresses.length > 0 && !loading && (
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.continueButton}
              activeOpacity={0.8}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>
                Deliver to this address
              </Text>

              <Ionicons
                name="arrow-forward"
                size={20}
                color="#1F2937"
              />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* =====================================================
          ADD / EDIT ADDRESS MODAL
      ===================================================== */}

      <AnimatePresence>
        {showModal && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                zIndex: 9999,
                elevation: 999,
              },
            ]}
          >
            <BlurView
              intensity={50}
              tint="dark"
              style={styles.blurContainer}
            >
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => {
                  if (!saving) {
                    setShowModal(false);
                    resetForm();
                  }
                }}
              />

              <KeyboardAvoidingView
                behavior={
                  Platform.OS === 'ios'
                    ? 'padding'
                    : 'height'
                }
                style={styles.keyboardView}
                keyboardVerticalOffset={
                  Platform.OS === 'android'
                    ? -30
                    : 0
                }
              >
                <MotiView
                  from={{
                    translateY: height,
                  }}
                  animate={{
                    translateY: 0,
                  }}
                  exit={{
                    translateY: height,
                  }}
                  transition={{
                    type: 'spring',
                    damping: 20,
                    stiffness: 150,
                  }}
                  style={styles.bottomSheet}
                >
                  <View
                    style={styles.dragIndicator}
                  />

                  <Text style={styles.modalTitle}>
                    {editingAddressId
                      ? 'Edit Address'
                      : 'Add New Address'}
                  </Text>

                  <ScrollView
                    showsVerticalScrollIndicator={
                      false
                    }
                    contentContainerStyle={{
                      paddingBottom: 40,
                    }}
                    keyboardShouldPersistTaps="handled"
                  >
                    {/* ADDRESS TYPE */}

                    <Text style={styles.fieldLabel}>
                      Address Type
                    </Text>

                    <View style={styles.typeRow}>
                      {(
                        [
                          'HOME',
                          'WORK',
                          'OTHER',
                        ] as AddressType[]
                      ).map((type) => {
                        const active =
                          form.type === type;

                        return (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.typeButton,
                              active &&
                                styles.typeButtonActive,
                            ]}
                            activeOpacity={0.8}
                            onPress={() =>
                              updateForm(
                                'type',
                                type,
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.typeButtonText,
                                active &&
                                  styles.typeButtonTextActive,
                              ]}
                            >
                              {type === 'HOME'
                                ? 'Home'
                                : type === 'WORK'
                                  ? 'Work'
                                  : 'Other'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* NAME */}

                    <View
                      style={styles.inputContainer}
                    >
                      <Ionicons
                        name="person-outline"
                        size={20}
                        color="#EAB308"
                        style={styles.inputIcon}
                      />

                      <TextInput
                        style={styles.input}
                        placeholder="Full Name"
                        placeholderTextColor="#9CA3AF"
                        value={form.name}
                        onChangeText={(value) =>
                          updateForm(
                            'name',
                            value,
                          )
                        }
                        editable={!saving}
                      />
                    </View>

                    {/* PHONE */}

                    <View
                      style={styles.inputContainer}
                    >
                      <Ionicons
                        name="call-outline"
                        size={20}
                        color="#EAB308"
                        style={styles.inputIcon}
                      />

                      <TextInput
                        style={styles.input}
                        placeholder="10-digit Mobile Number"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="phone-pad"
                        maxLength={10}
                        value={form.phone}
                        onChangeText={(value) =>
                          updateForm(
                            'phone',
                            value.replace(
                              /\D/g,
                              '',
                            ),
                          )
                        }
                        editable={!saving}
                      />
                    </View>

                    {/* ADDRESS */}

                    <View
                      style={styles.inputContainer}
                    >
                      <Ionicons
                        name="location-outline"
                        size={20}
                        color="#EAB308"
                        style={styles.inputIcon}
                      />

                      <TextInput
                        style={styles.input}
                        placeholder="House No., Street, Area"
                        placeholderTextColor="#9CA3AF"
                        value={
                          form.addressLine1
                        }
                        onChangeText={(value) =>
                          updateForm(
                            'addressLine1',
                            value,
                          )
                        }
                        editable={!saving}
                      />
                    </View>

                    {/* ADDRESS LINE 2 */}

                    <View
                      style={styles.inputContainer}
                    >
                      <Ionicons
                        name="home-outline"
                        size={20}
                        color="#EAB308"
                        style={styles.inputIcon}
                      />

                      <TextInput
                        style={styles.input}
                        placeholder="Apartment / Floor (Optional)"
                        placeholderTextColor="#9CA3AF"
                        value={
                          form.addressLine2
                        }
                        onChangeText={(value) =>
                          updateForm(
                            'addressLine2',
                            value,
                          )
                        }
                        editable={!saving}
                      />
                    </View>

                    {/* CITY */}

                    <View
                      style={styles.inputContainer}
                    >
                      <Feather
                        name="map-pin"
                        size={20}
                        color="#EAB308"
                        style={styles.inputIcon}
                      />

                      <TextInput
                        style={styles.input}
                        placeholder="City"
                        placeholderTextColor="#9CA3AF"
                        value={form.city}
                        onChangeText={(value) =>
                          updateForm(
                            'city',
                            value,
                          )
                        }
                        editable={!saving}
                      />
                    </View>

                    {/* STATE */}

                    <View
                      style={styles.inputContainer}
                    >
                      <Feather
                        name="map"
                        size={20}
                        color="#EAB308"
                        style={styles.inputIcon}
                      />

                      <TextInput
                        style={styles.input}
                        placeholder="State"
                        placeholderTextColor="#9CA3AF"
                        value={form.state}
                        onChangeText={(value) =>
                          updateForm(
                            'state',
                            value,
                          )
                        }
                        editable={!saving}
                      />
                    </View>

                    {/* PINCODE */}

                    <View
                      style={styles.inputContainer}
                    >
                      <Feather
                        name="hash"
                        size={20}
                        color="#EAB308"
                        style={styles.inputIcon}
                      />

                      <TextInput
                        style={styles.input}
                        placeholder="6-digit Pincode"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={form.pincode}
                        onChangeText={(value) =>
                          updateForm(
                            'pincode',
                            value.replace(
                              /\D/g,
                              '',
                            ),
                          )
                        }
                        editable={!saving}
                      />
                    </View>

                    {/* LANDMARK */}

                    <View
                      style={styles.inputContainer}
                    >
                      <Ionicons
                        name="navigate-outline"
                        size={20}
                        color="#EAB308"
                        style={styles.inputIcon}
                      />

                      <TextInput
                        style={styles.input}
                        placeholder="Landmark (Optional)"
                        placeholderTextColor="#9CA3AF"
                        value={form.landmark}
                        onChangeText={(value) =>
                          updateForm(
                            'landmark',
                            value,
                          )
                        }
                        editable={!saving}
                      />
                    </View>

                    {/* SAVE */}

                    <TouchableOpacity
                      style={[
                        styles.saveBtn,
                        saving &&
                          styles.saveBtnDisabled,
                      ]}
                      activeOpacity={0.8}
                      onPress={
                        handleSaveAddress
                      }
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator
                          size="small"
                          color="#FFF"
                        />
                      ) : (
                        <Text
                          style={
                            styles.saveBtnText
                          }
                        >
                          {editingAddressId
                            ? 'Update Address'
                            : 'Save Address'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </ScrollView>
                </MotiView>
              </KeyboardAvoidingView>
            </BlurView>
          </View>
        )}
      </AnimatePresence>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
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

  headerSpacer: {
    width: 40,
  },

  addBtnContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },

  addBtnText: {
    color: '#65A30D',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },

  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },

  emptyListContainer: {
    flexGrow: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },

  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },

  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },

  emptyAddButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 7,
  },

  addressCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  addressCardSelected: {
    borderColor: '#EAB308',
    backgroundColor: '#FFFEF3',
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  tagBadgeSelected: {
    backgroundColor: '#65A30D',
  },

  tagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },

  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  editButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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

  radioCircleSelected: {
    borderColor: '#EAB308',
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EAB308',
  },

  cardName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 5,
  },

  cardAddress: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 21,
    marginBottom: 8,
  },

  cardMobile: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },

  setDefaultButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    minHeight: 28,
    justifyContent: 'center',
  },

  setDefaultText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#65A30D',
  },

  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  defaultText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 5,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
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

  continueButton: {
    height: 52,
    backgroundColor: '#EAB308',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  continueButtonText: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '900',
    marginRight: 8,
  },

  blurContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  bottomSheet: {
    width: '100%',
    maxHeight: height * 0.90,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },

  dragIndicator: {
    width: 50,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 20,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 8,
  },

  typeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  typeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 4,
  },

  typeButtonActive: {
    backgroundColor: '#FEF9C3',
    borderColor: '#EAB308',
  },

  typeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },

  typeButtonTextActive: {
    color: '#1F2937',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 16,
    minHeight: 56,
    marginBottom: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },

  inputIcon: {
    marginRight: 12,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
    minHeight: 54,
  },

  saveBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#EAB308',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#EAB308',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  saveBtnDisabled: {
    opacity: 0.7,
  },

  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});