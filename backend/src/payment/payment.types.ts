export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

export interface PaymentWebhookPayload {
  event: string;

  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        amount?: number;
        method?: string;
      };
    };

    order?: {
      entity?: {
        id?: string;
        status?: string;
      };
    };
  };
}