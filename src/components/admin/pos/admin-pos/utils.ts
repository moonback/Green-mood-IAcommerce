import { Category, Order, OrderItem, Product } from '../../../../lib/types';
import { AppliedPromo, CartLine, DailyReport } from '../types';

export const POS_UNLOCK_PIN = '1234';

export function getBusinessDate(): string {
  const now = new Date();
  const businessDate = new Date(now);
  if (now.getHours() < 6) {
    businessDate.setDate(now.getDate() - 1);
  }
  return businessDate.toLocaleDateString('en-CA');
}

export function getBusinessDayRange(dateString: string): { start: Date; end: Date } {
  const start = new Date(`${dateString}T06:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function filterPOSProducts(products: Product[], searchQuery: string, selectedCategory: string): Product[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return products.filter((product) => {
    const matchesSearch = !normalizedQuery || product.name.toLowerCase().includes(normalizedQuery);

    if (selectedCategory === 'favorites') {
      return product.is_featured && matchesSearch && product.stock_quantity > 0;
    }

    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    return matchesCategory && matchesSearch && product.stock_quantity > 0;
  });
}

export function computeCartMetrics(params: {
  cart: CartLine[];
  discountType: 'percent' | 'fixed';
  discountValue: string;
  useLoyaltyPoints: boolean;
  pointsToRedeem: number;
  loyaltyRedeemRate: number;
  appliedPromo: AppliedPromo | null;
  cashGiven: string;
}) {
  const subtotal = params.cart.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const manualDiscountValue = Number.parseFloat(params.discountValue) || 0;
  const discount = manualDiscountValue <= 0
    ? 0
    : params.discountType === 'percent'
      ? Math.min(subtotal, (subtotal * manualDiscountValue) / 100)
      : Math.min(subtotal, manualDiscountValue);

  const loyaltyDiscount = params.useLoyaltyPoints
    ? (params.pointsToRedeem / 100) * params.loyaltyRedeemRate
    : 0;
  const promoDiscount = params.appliedPromo?.discount_amount ?? 0;
  const total = Math.max(0, subtotal - discount - loyaltyDiscount - promoDiscount);
  const cashNum = Number.parseFloat(params.cashGiven) || 0;
  const change = Math.max(0, cashNum - total);
  const cartItemCount = params.cart.reduce((sum, line) => sum + line.quantity, 0);

  return { subtotal, discount, loyaltyDiscount, promoDiscount, total, cashNum, change, cartItemCount };
}

export function getActiveCategories(categories: Category[], products: Product[]): Category[] {
  return categories.filter((category) => category.is_active && products.some((product) => product.category_id === category.id));
}

export function getCategoryName(categories: Category[], selectedCategory: string): string {
  if (selectedCategory === 'all') return 'Tous les produits';
  if (selectedCategory === 'favorites') return 'Favoris';
  return categories.find((category) => category.id === selectedCategory)?.name || 'Produits';
}

export function buildDailyReport(orders: (Pick<Order, 'total' | 'notes'> & { order_items?: OrderItem[] })[], date: Date): DailyReport {
  const report: DailyReport = {
    totalSales: 0,
    cashTotal: 0,
    cardTotal: 0,
    mobileTotal: 0,
    itemsSold: 0,
    orderCount: orders.length,
    date,
    productBreakdown: {},
  };

  orders.forEach((order) => {
    report.totalSales += order.total;
    if (order.notes?.includes('Paiement: Espèces')) report.cashTotal += order.total;
    else if (order.notes?.includes('Paiement: Carte')) report.cardTotal += order.total;
    else if (order.notes?.includes('Paiement: Mobile')) report.mobileTotal += order.total;

    order.order_items?.forEach((item) => {
      report.itemsSold += item.quantity;
      const productName = item.product_name || 'Inconnu';
      if (!report.productBreakdown[productName]) {
        report.productBreakdown[productName] = { qty: 0, total: 0 };
      }
      report.productBreakdown[productName].qty += item.quantity;
      report.productBreakdown[productName].total += item.total_price || 0;
    });
  });

  return report;
}
