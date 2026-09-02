declare module 'react-native-razorpay' {
  export interface RazorpayCheckoutOptions {
    key: string;
    amount: number;
    currency: string;
    name?: string;
    description?: string;
    order_id?: string;

    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };

    notes?: Record<string, string>;

    theme?: {
      color?: string;
      backdrop_color?: string;
    };

    modal?: {
      confirm_close?: boolean;
      escape?: boolean;
      animation?: boolean;
      ondismiss?: () => void;
    };
  }

  export interface RazorpaySuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  interface RazorpayCheckout {
    open(
      options: RazorpayCheckoutOptions,
    ): Promise<RazorpaySuccessResponse>;

    on(
      event: string,
      handler: (data: unknown) => void,
    ): void;

    onExternalWallet?(
      handler: (data: unknown) => void,
    ): void;
  }

  const RazorpayCheckout: RazorpayCheckout;

  export default RazorpayCheckout;
}