import { Product } from '../../../lib/types';

export interface CartLine {
    product: Product;
    quantity: number;
    unitPrice: number; // can be overridden
}

export type PaymentMethod = 'cash' | 'card' | 'mobile';

export interface AppliedPromo {
    code: string;
    description: string | null;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    discount_amount: number;
}

export interface CompletedSale {
    orderId: string;
    shortId: string;
    lines: CartLine[];
    subtotal: number;
    discount: number;
    promoCode?: string;
    promoDiscount?: number;
    total: number;
    paymentMethod: PaymentMethod;
    cashGiven?: number;
    change?: number;
    timestamp: Date;
    loyaltyGained?: number;
    loyaltyRedeemed?: number;
}

export interface DailyReport {
    totalSales: number;
    cashTotal: number;
    cardTotal: number;
    mobileTotal: number;
    itemsSold: number;
    orderCount: number;
    date: Date;
    productBreakdown: { [name: string]: { qty: number, total: number } };
    cashCounted?: number;
    cashDifference?: number;
}
