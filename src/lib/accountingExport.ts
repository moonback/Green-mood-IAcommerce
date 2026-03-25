// ─── Accounting Export ──────────────────────────────────────────────────────
// Generates CSV and XLSX exports for accounting purposes
// Monthly sales reports with CA, TVA, discounts, payment methods

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { Order, OrderItem } from './types';
import { TVA_RATE, formatCurrency } from './invoiceGenerator';
import { useSettingsStore } from '../store/settingsStore';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SalesReportRow {
  date: string;
  invoice_number: string;
  order_id: string;
  client: string;
  delivery_type: string;
  status: string;
  payment_status: string;
  subtotal_ht: number;
  tva: number;
  subtotal_ttc: number;
  delivery_fee: number;
  promo_code: string;
  promo_discount: number;
  loyalty_points_used: number;
  total_ttc: number;
  payment_method: string;
  items_count: number;
  items_detail: string;
}

export interface MonthlySummary {
  month: string;
  total_orders: number;
  total_ca_ht: number;
  total_tva: number;
  total_ca_ttc: number;
  total_delivery_fees: number;
  total_discounts: number;
  total_net: number;
  payment_cash: number;
  payment_card: number;
  payment_online: number;
  payment_other: number;
  avg_order_value: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DELIVERY_LABELS: Record<string, string> = {
  click_collect: 'Click & Collect',
  delivery: 'Livraison',
  in_store: 'Boutique',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payé',
  processing: 'En préparation',
  ready: 'Prêt',
  shipped: 'Expédié',
  delivered: 'Livré',
  cancelled: 'Annulé',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payé',
  failed: 'Échoué',
  refunded: 'Remboursé',
};

function formatDateFR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getPaymentMethod(order: Order): string {
  if (order.delivery_type === 'in_store') {
    // POS sales - check notes for payment method details
    if (order.notes?.toLowerCase().includes('espèces') || order.notes?.toLowerCase().includes('cash')) return 'Espèces';
    if (order.notes?.toLowerCase().includes('carte')) return 'Carte';
    if (order.notes?.toLowerCase().includes('mobile')) return 'Mobile';
    return 'Boutique';
  }
  if (order.viva_order_code) return 'Carte (en ligne)';
  if (order.payment_status === 'paid') return 'En ligne';
  return 'Non spécifié';
}

function generateInvoiceNum(order: Order): string {
  const date = new Date(order.created_at);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `GM-${y}${m}-${order.id.slice(0, 8).toUpperCase()}`;
}

// ─── Data Preparation ─────────────────────────────────────────────────────────

export function prepareOrderRows(orders: Order[]): SalesReportRow[] {
  return orders
    .filter(o => o.status !== 'cancelled')
    .map(order => {
      const items = (order.order_items ?? []) as OrderItem[];
      const subtotalTTC = Number(order.subtotal);
      const subtotalHT = subtotalTTC / (1 + TVA_RATE);
      const tva = subtotalTTC - subtotalHT;

      return {
        date: formatDateFR(order.created_at),
        invoice_number: generateInvoiceNum(order),
        order_id: `#${order.id.slice(0, 8).toUpperCase()}`,
        client: order.profile?.full_name ?? 'Client anonyme',
        delivery_type: DELIVERY_LABELS[order.delivery_type] ?? order.delivery_type,
        status: STATUS_LABELS[order.status] ?? order.status,
        payment_status: PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status,
        subtotal_ht: Math.round(subtotalHT * 100) / 100,
        tva: Math.round(tva * 100) / 100,
        subtotal_ttc: subtotalTTC,
        delivery_fee: Number(order.delivery_fee),
        promo_code: order.promo_code ?? '',
        promo_discount: Number(order.promo_discount ?? 0),
        loyalty_points_used: order.loyalty_points_redeemed ?? 0,
        total_ttc: Number(order.total),
        payment_method: getPaymentMethod(order),
        items_count: items.reduce((s, i) => s + i.quantity, 0),
        items_detail: items.map(i => `${i.product_name} x${i.quantity}`).join(', '),
      };
    });
}

export function prepareMonthlySummary(orders: Order[]): MonthlySummary[] {
  const validOrders = orders.filter(o => o.status !== 'cancelled' && o.payment_status === 'paid');
  const grouped = new Map<string, Order[]>();

  for (const order of validOrders) {
    const d = new Date(order.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const arr = grouped.get(key) ?? [];
    arr.push(order);
    grouped.set(key, arr);
  }

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  return Array.from(grouped.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, monthOrders]) => {
      const [year, month] = key.split('-');
      const totalTTC = monthOrders.reduce((s, o) => s + Number(o.total), 0);
      const subtotalTTC = monthOrders.reduce((s, o) => s + Number(o.subtotal), 0);
      const subtotalHT = subtotalTTC / (1 + TVA_RATE);
      const tva = subtotalTTC - subtotalHT;
      const deliveryFees = monthOrders.reduce((s, o) => s + Number(o.delivery_fee), 0);
      const discounts = monthOrders.reduce((s, o) => s + Number(o.promo_discount ?? 0), 0);

      // Payment method breakdown
      let cash = 0, card = 0, online = 0, other = 0;
      for (const o of monthOrders) {
        const method = getPaymentMethod(o);
        const total = Number(o.total);
        if (method === 'Espèces') cash += total;
        else if (method === 'Carte' || method === 'Carte (en ligne)') card += total;
        else if (method === 'En ligne') online += total;
        else other += total;
      }

      return {
        month: `${monthNames[parseInt(month) - 1]} ${year}`,
        total_orders: monthOrders.length,
        total_ca_ht: Math.round(subtotalHT * 100) / 100,
        total_tva: Math.round(tva * 100) / 100,
        total_ca_ttc: Math.round(subtotalTTC * 100) / 100,
        total_delivery_fees: Math.round(deliveryFees * 100) / 100,
        total_discounts: Math.round(discounts * 100) / 100,
        total_net: Math.round(totalTTC * 100) / 100,
        payment_cash: Math.round(cash * 100) / 100,
        payment_card: Math.round(card * 100) / 100,
        payment_online: Math.round(online * 100) / 100,
        payment_other: Math.round(other * 100) / 100,
        avg_order_value: Math.round((totalTTC / monthOrders.length) * 100) / 100,
      };
    });
}

// ─── CSV Export ────────────────────────────────────────────────────────────────

const CSV_HEADERS: Record<string, string> = {
  date: 'Date',
  invoice_number: 'N° Facture',
  order_id: 'N° Commande',
  client: 'Client',
  delivery_type: 'Mode de livraison',
  status: 'Statut',
  payment_status: 'Paiement',
  subtotal_ht: 'Sous-total HT',
  tva: 'TVA (20%)',
  subtotal_ttc: 'Sous-total TTC',
  delivery_fee: 'Frais de livraison',
  promo_code: 'Code promo',
  promo_discount: 'Remise',
  loyalty_points_used: 'Points fidélité utilisés',
  total_ttc: 'Total TTC',
  payment_method: 'Mode de paiement',
  items_count: 'Nb articles',
  items_detail: 'Détail articles',
};

const SUMMARY_HEADERS: Record<string, string> = {
  month: 'Mois',
  total_orders: 'Nb commandes',
  total_ca_ht: 'CA HT',
  total_tva: 'TVA collectée',
  total_ca_ttc: 'CA TTC',
  total_delivery_fees: 'Total livraison',
  total_discounts: 'Total remises',
  total_net: 'CA Net TTC',
  payment_cash: 'Espèces',
  payment_card: 'Carte',
  payment_online: 'En ligne',
  payment_other: 'Autre',
  avg_order_value: 'Panier moyen',
};

export function exportCSV(orders: Order[], filename?: string): void {
  const currencyName = useSettingsStore.getState().settings.loyalty_currency_name || 'pts';
  const headers = { ...CSV_HEADERS, loyalty_points_used: `${currencyName} utilisés` };
  const rows = prepareOrderRows(orders);
  const renamedRows = rows.map(row => {
    const renamed: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      renamed[headers[key] ?? key] = value;
    }
    return renamed;
  });

  const csv = Papa.unparse(renamedRows, { delimiter: ';' });
  // Add BOM for Excel compatibility
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename ?? `Green_Mood_Ventes_${getDateSuffix()}.csv`);
}

export function exportSummaryCSV(orders: Order[], filename?: string): void {
  const summary = prepareMonthlySummary(orders);
  const renamedRows = summary.map(row => {
    const renamed: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      renamed[SUMMARY_HEADERS[key] ?? key] = value;
    }
    return renamed;
  });

  const csv = Papa.unparse(renamedRows, { delimiter: ';' });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename ?? `Green_Mood_Resume_Mensuel_${getDateSuffix()}.csv`);
}

// ─── XLSX Export ───────────────────────────────────────────────────────────────

export function exportXLSX(orders: Order[], filename?: string): void {
  const currencyName = useSettingsStore.getState().settings.loyalty_currency_name || 'pts';
  const xlsxHeaders = { ...CSV_HEADERS, loyalty_points_used: `${currencyName} utilisés` };
  const rows = prepareOrderRows(orders);
  const summary = prepareMonthlySummary(orders);

  const wb = XLSX.utils.book_new();

  // Sheet 1: Detailed sales
  const detailHeaders = Object.values(xlsxHeaders);
  const detailData = rows.map(row => Object.keys(xlsxHeaders).map(key => (row as any)[key]));
  const ws1 = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailData]);

  // Set column widths
  ws1['!cols'] = [
    { wch: 12 }, // Date
    { wch: 20 }, // Invoice number
    { wch: 12 }, // Order ID
    { wch: 20 }, // Client
    { wch: 16 }, // Delivery type
    { wch: 14 }, // Status
    { wch: 12 }, // Payment status
    { wch: 14 }, // Subtotal HT
    { wch: 12 }, // TVA
    { wch: 14 }, // Subtotal TTC
    { wch: 14 }, // Delivery fee
    { wch: 14 }, // Promo code
    { wch: 10 }, // Promo discount
    { wch: 12 }, // Loyalty points
    { wch: 14 }, // Total TTC
    { wch: 18 }, // Payment method
    { wch: 10 }, // Items count
    { wch: 40 }, // Items detail
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'Ventes détaillées');

  // Sheet 2: Monthly summary
  const summaryHeaders = Object.values(SUMMARY_HEADERS);
  const summaryData = summary.map(row => Object.keys(SUMMARY_HEADERS).map(key => (row as any)[key]));
  const ws2 = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryData]);

  ws2['!cols'] = [
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'Résumé mensuel');

  // Sheet 3: TVA Summary
  const tvaData = summary.map(row => [
    row.month,
    row.total_ca_ht,
    `${(TVA_RATE * 100).toFixed(0)}%`,
    row.total_tva,
    row.total_ca_ttc,
  ]);
  const ws3 = XLSX.utils.aoa_to_sheet([
    ['Mois', 'Base HT', 'Taux TVA', 'TVA collectée', 'Total TTC'],
    ...tvaData,
  ]);
  ws3['!cols'] = [
    { wch: 16 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, 'TVA');

  const xlsxFile = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([xlsxFile], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, filename ?? `Green_Mood_Comptabilite_${getDateSuffix()}.xlsx`);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
}

function getDateSuffix(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
