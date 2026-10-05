export enum PaymentMethod {
  Cash = "Cash",
  BankTransfer = "BankTransfer",
  QrPayment = "QrPayment",
  Card = "Card",
  EWallet = "EWallet",
  Online = "Online",
  Other = "Other",
}

export enum PaymentStatus {
  Pending = "Pending",
  Completed = "Completed",
  Failed = "Failed",
  Cancelled = "Cancelled",
  Refunded = "Refunded",
  PartiallyRefunded = "PartiallyRefunded",
}

export type CreatePaymentRequest = {
  paymentMethod: PaymentMethod;
  amount: number;
  tenderedAmount?: number;
  transactionReference?: string;
  provider?: string;
  providerTransactionId?: string;
  note?: string;
  idempotencyKey?: string;
  currencyCode?: string;
};

export type PaymentResponse = {
  id: string;
  orderId: string;
  branchId: string;
  paymentNumber: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  tenderedAmount?: number;
  changeAmount?: number;
  currencyCode: string;
  transactionReference?: string;
  provider?: string;
  providerTransactionId?: string;
  completedAt?: string;
  createdAt: string;
  note?: string;
};

export type PaymentSummary = {
  orderTotal: number;
  paidAmount: number;
  refundedAmount: number;
  netPaidAmount: number;
  remainingAmount: number;
  paymentStatus: string;
};
