namespace RestaurantManagement.Domain.Enums;

public enum OrderType { DineIn, Takeaway, Delivery, Online }
public enum OrderStatus { Draft, Open, Pending, Confirmed, Preparing, Ready, Completed, Cancelled }
public enum PaymentMethod { Cash, BankTransfer, QrPayment, Card, EWallet, Online, Other }
public enum PaymentStatus { Pending, Processing, Completed, Failed, PartiallyRefunded, Refunded, Cancelled }
public enum InventoryTransactionType { Receipt, Issue, Adjustment, TransferIn, TransferOut, Count }
public enum KitchenOrderStatus { New, Accepted, Preparing, Ready, Completed, Cancelled }
public enum KitchenPriority { Normal, High, Urgent }
public enum DeliveryStatus { Pending, Preparing, ReadyForPickup, PickedUp, Delivering, Delivered, Cancelled }
public enum PromotionType { Percentage, FixedAmount, ProductDiscount, CategoryDiscount, BuyXGetY, ComboDiscount }
public enum ShiftStatus { Open, Closed }
public enum TableStatus { Available, Occupied, Reserved, Cleaning, OutOfService }
public enum ModifierSelectionType { Single, Multiple }
public enum PurchaseOrderStatus { Draft, Sent, Approved, PartiallyReceived, Received, Cancelled }
public enum TableAllocationType { Primary, Shared, Temporary }
public enum InventoryReferenceType { None, Order, StockTransfer, StockCount, PurchaseOrder, GoodsReceipt, ManualAdjustment }