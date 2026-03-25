// ─── Invoice PDF Generator ─────────────────────────────────────────────────
// Premium design — legal French invoice for CBD products
// Features: sidebar accent, payment stamp, loyalty/promo discounts, full company info

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Order, OrderItem } from './types';
import { useSettingsStore } from '../store/settingsStore';
import { supabase } from './supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const TVA_RATE = 0.20;

interface InvoiceCompanyInfo {
  name: string;
  address: string;
  phone: string;
  email?: string;
  siret?: string;
  tvaIntra?: string;
}

const DEFAULT_COMPANY: InvoiceCompanyInfo = {
  name: 'Eco CBD',
  address: '123 Rue de la Nature, 75000 Paris',
  phone: '01 23 45 67 89',
  email: 'contact@greenmood.fr',
  siret: 'XXX XXX XXX XXXXX',
  tvaIntra: 'FR XX XXXXXXXXX',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + ' €';
}

function generateInvoiceNumber(order: Order): string {
  const { settings } = useSettingsStore.getState();
  const storeName = settings.store_name || 'Eco CBD';
  const initials = storeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 3);
  const prefix = initials || 'GM';
  
  const date = new Date(order.created_at);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const shortId = order.id.slice(0, 8).toUpperCase();
  return `${prefix}-${year}${month}-${shortId}`;
}

async function fetchImageBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Could not load logo for PDF', e);
    return null;
  }
}

// ─── PDF Generation ───────────────────────────────────────────────────────────

export async function generateInvoicePDF(
  order: Order,
  companyOverrides?: Partial<InvoiceCompanyInfo>
): Promise<jsPDF> {
  const { settings } = useSettingsStore.getState();
  const effectiveTaxRate = (settings.invoice_tax_rate !== undefined)
    ? settings.invoice_tax_rate / 100
    : TVA_RATE;

  const company: InvoiceCompanyInfo = {
    ...DEFAULT_COMPANY,
    name: settings.store_name || DEFAULT_COMPANY.name,
    address: settings.store_address || DEFAULT_COMPANY.address,
    phone: settings.store_phone || DEFAULT_COMPANY.phone,
    email: settings.store_email || DEFAULT_COMPANY.email,
    siret: settings.store_siret || DEFAULT_COMPANY.siret,
    tvaIntra: settings.store_tva_intra || DEFAULT_COMPANY.tvaIntra,
    ...companyOverrides,
  };

  // Fetch missing profile / address
  let actualProfile = order.profile || (order as any).profiles;
  if (!actualProfile && order.user_id) {
    const { data } = await supabase.from('profiles').select('*').eq('id', order.user_id).single();
    if (data) actualProfile = data;
  }
  if (Array.isArray(actualProfile)) actualProfile = actualProfile[0];

  let actualAddress = order.address || (order as any).addresses;
  if (!actualAddress && order.address_id) {
    const { data } = await supabase.from('addresses').select('*').eq('id', order.address_id).single();
    if (data) actualAddress = data;
  }
  if (Array.isArray(actualAddress)) actualAddress = actualAddress[0];

  // Load logo
  let logoBase64: string | null = null;
  if (settings.store_logo_url) {
    logoBase64 = await fetchImageBase64(settings.store_logo_url);
  }

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const invoiceNumber = generateInvoiceNumber(order);

  // ─── Color Palette ────────────────────────────────────────────────────────
  const green: [number, number, number]       = [21, 128, 61];    // primary green
  const lightGreen: [number, number, number]  = [240, 253, 244];  // very light green bg
  const neonGreen: [number, number, number]   = [57, 255, 20];    // neon for dark bg
  const headerDark: [number, number, number]  = [15, 23, 18];     // near-black
  const white: [number, number, number]       = [255, 255, 255];
  const zinc50: [number, number, number]      = [250, 250, 250];
  const zinc100: [number, number, number]     = [244, 244, 245];
  const zinc200: [number, number, number]     = [228, 228, 231];
  const zinc500: [number, number, number]     = [113, 113, 122];
  const zinc800: [number, number, number]     = [39, 39, 42];

  // ─── White background ─────────────────────────────────────────────────────
  doc.setFillColor(...white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // ─── Left sidebar strip ───────────────────────────────────────────────────
  const sidebarW = 6;
  doc.setFillColor(...green);
  doc.rect(0, 0, sidebarW, pageHeight, 'F');

  // ─── Header block ─────────────────────────────────────────────────────────
  const headerH = 52;
  doc.setFillColor(...headerDark);
  doc.rect(sidebarW, 0, pageWidth - sidebarW, headerH, 'F');

  // Thin neon line at bottom of header
  doc.setFillColor(...neonGreen);
  doc.rect(sidebarW, headerH, pageWidth - sidebarW, 1, 'F');

  // ─── Logo / Company name ──────────────────────────────────────────────────
  const margin = 14 + sidebarW; // offset for sidebar
  const contentWidth = pageWidth - margin - 14;
  const logoY = 10;
  const logoH = 30;

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, logoY, 40, logoH, 'LOGO', 'MEDIUM');
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...neonGreen);
      doc.text(company.name, margin, 32);
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...neonGreen);
    doc.text(company.name, margin, 32);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(company.address, margin, 40);
  }

  // ─── FACTURE label ────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...white);
  doc.text('FACTURE', pageWidth - 14, 22, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...neonGreen);
  doc.text(`N° ${invoiceNumber}`, pageWidth - 14, 31, { align: 'right' });

  doc.setFontSize(7.5);
  doc.setTextColor(180, 180, 180);
  doc.text(`Émise le : ${formatDate(order.created_at)}`, pageWidth - 14, 39, { align: 'right' });

  // ─── Payment stamp ────────────────────────────────────────────────────────
  const isPaid = order.payment_status === 'paid';
  const stampColor: [number, number, number] = isPaid ? [21, 128, 61] : [202, 138, 4];
  const stampText = isPaid ? 'ACQUITTÉ' : 'EN ATTENTE';
  doc.setDrawColor(...stampColor);
  doc.setLineWidth(0.8);
  doc.roundedRect(pageWidth - 60, 5, 46, 14, 2, 2, 'S');
  doc.setTextColor(...stampColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(stampText, pageWidth - 37, 14, { align: 'center' });

  // ─── Info boxes (Émetteur + Client) ──────────────────────────────────────
  let y = headerH + 8;
  const boxH = 54;
  const halfW = (contentWidth - 8) / 2;

  // Company box
  doc.setFillColor(...zinc50);
  doc.setDrawColor(...zinc200);
  doc.roundedRect(margin, y, halfW, boxH, 3, 3, 'FD');

  // Green top bar on company box
  doc.setFillColor(...green);
  doc.roundedRect(margin, y, halfW, 7, 3, 3, 'F');
  doc.rect(margin, y + 4, halfW, 3, 'F'); // flatten bottom corners
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...white);
  doc.text('ÉMETTEUR', margin + 5, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...zinc800);
  doc.text(company.name, margin + 5, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...zinc500);
  let ey = y + 23;
  const compLines = [
    company.address,
    `Tél : ${company.phone}`,
    ...(company.email ? [`Email : ${company.email}`] : []),
    ...(company.siret ? [`SIRET : ${company.siret}`] : []),
    ...(company.tvaIntra ? [`TVA Intra : ${company.tvaIntra}`] : []),
  ];
  compLines.forEach(line => {
    doc.text(line, margin + 5, ey);
    ey += 5.5;
  });

  // Client box
  const clientX = margin + halfW + 8;
  doc.setFillColor(...zinc50);
  doc.setDrawColor(...zinc200);
  doc.roundedRect(clientX, y, halfW, boxH, 3, 3, 'FD');

  // Teal top bar on client box
  doc.setFillColor(15, 118, 110); // teal-700
  doc.roundedRect(clientX, y, halfW, 7, 3, 3, 'F');
  doc.rect(clientX, y + 4, halfW, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...white);
  doc.text('CLIENT', clientX + 5, y + 5.5);

  const clientName = actualProfile?.full_name ?? 'Client';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...zinc800);
  doc.text(clientName, clientX + 5, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...zinc500);
  let cy = y + 23;
  if (actualAddress) {
    doc.text(actualAddress.street, clientX + 5, cy); cy += 5.5;
    doc.text(`${actualAddress.postal_code} ${actualAddress.city}`, clientX + 5, cy); cy += 5.5;
    doc.text(actualAddress.country || 'France', clientX + 5, cy); cy += 5.5;
  }
  if (actualProfile?.phone) { doc.text(`Tél : ${actualProfile.phone}`, clientX + 5, cy); cy += 5.5; }
  if (actualProfile?.email) { doc.text(`Email : ${actualProfile.email}`, clientX + 5, cy); cy += 5.5; }

  // Delivery mode badge (bottom right of client box)
  const deliveryLabels: Record<string, string> = {
    click_collect: '🏪 Click & Collect',
    delivery: '🚚 Livraison à domicile',
    in_store: '🛒 Vente boutique',
  };
  const delivLabel = deliveryLabels[order.delivery_type] ?? order.delivery_type;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(15, 118, 110);
  doc.text(delivLabel, clientX + 5, y + boxH - 6);

  y += boxH + 10;

  // ─── Order ref bar ────────────────────────────────────────────────────────
  doc.setFillColor(...lightGreen);
  doc.setDrawColor(187, 247, 208); // green-200
  doc.roundedRect(margin, y, contentWidth, 9, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...green);
  doc.text(`Référence commande : #${order.id.slice(0, 8).toUpperCase()}`, margin + 5, y + 6);
  const loyaltyPts = order.loyalty_points_earned;
  if (loyaltyPts > 0) {
    doc.text(`+${loyaltyPts} ${settings.loyalty_currency_name} gagnés`, pageWidth - 14, y + 6, { align: 'right' });
  }
  y += 15;

  // ─── Products Table ───────────────────────────────────────────────────────
  const items = (order.order_items ?? []) as OrderItem[];
  const tableBody = items.map((item, idx) => {
    const unitHT = Number(item.unit_price) / (1 + effectiveTaxRate);
    const totalHT = unitHT * item.quantity;
    const tva = totalHT * effectiveTaxRate;
    return [
      String(idx + 1),
      item.product_name,
      String(item.quantity),
      formatCurrency(unitHT),
      `${(effectiveTaxRate * 100).toFixed(0)}%`,
      formatCurrency(tva),
      formatCurrency(totalHT + tva),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Désignation', 'Qté', 'P.U. HT', 'TVA', 'Mt TVA', 'Total TTC']],
    body: tableBody,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: zinc800,
      cellPadding: { top: 5, bottom: 5, left: 5, right: 5 },
    },
    headStyles: {
      fillColor: zinc800,
      textColor: white,
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: { top: 6, bottom: 6, left: 5, right: 5 },
    },
    alternateRowStyles: { fillColor: zinc50 },
    bodyStyles: {
      lineWidth: 0.1,
      lineColor: zinc200,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 13, halign: 'center' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: 14 },
  });

  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 8;

  // ─── Totals ───────────────────────────────────────────────────────────────
  const promoDiscount = Number(order.promo_discount ?? 0);
  const loyaltyPointsRedeemed = Number(order.loyalty_points_redeemed ?? 0);
  const loyaltyDiscount = Math.round((loyaltyPointsRedeemed / 100) * 5 * 100) / 100;

  const totW = 85;
  const totX = pageWidth - 14 - totW;

  let extraRows = 0;
  if (promoDiscount > 0) extraRows++;
  if (loyaltyDiscount > 0) extraRows++;
  const totH = 52 + extraRows * 7;

  doc.setFillColor(...zinc50);
  doc.setDrawColor(...zinc200);
  doc.roundedRect(totX, y, totW, totH, 3, 3, 'FD');

  const rowH = 7;
  let ty = y + 9;

  const drawRow = (label: string, value: string, color: [number, number, number] = zinc500, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...color);
    doc.text(label, totX + 5, ty);
    doc.text(value, totX + totW - 5, ty, { align: 'right' });
    ty += rowH;
  };

  const subtotalHT = Number(order.subtotal) / (1 + effectiveTaxRate);
  const tvaTotal = Number(order.subtotal) - subtotalHT;

  drawRow('Sous-total HT', formatCurrency(subtotalHT));
  drawRow(`TVA (${(effectiveTaxRate * 100).toFixed(0)}%)`, formatCurrency(tvaTotal));
  drawRow(
    'Livraison',
    Number(order.delivery_fee) === 0 ? 'Offerte ✓' : formatCurrency(Number(order.delivery_fee)),
    Number(order.delivery_fee) === 0 ? green : zinc500
  );

  if (promoDiscount > 0) {
    drawRow(
      `Remise${order.promo_code ? ` (${order.promo_code})` : ''}`,
      `-${formatCurrency(promoDiscount)}`,
      [217, 119, 6]
    );
  }
  if (loyaltyDiscount > 0) {
    drawRow(
      `Fidélité (-${loyaltyPointsRedeemed} ${settings.loyalty_currency_name})`,
      `-${formatCurrency(loyaltyDiscount)}`,
      [147, 51, 234]
    );
  }

  // Separator
  doc.setDrawColor(...green);
  doc.setLineWidth(0.6);
  doc.line(totX + 3, ty, totX + totW - 3, ty);
  ty += 7;

  // Total TTC
  doc.setFillColor(...green);
  doc.roundedRect(totX + 2, ty - 5, totW - 4, 13, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...white);
  doc.text('TOTAL TTC', totX + 7, ty + 3.5);
  doc.text(formatCurrency(Number(order.total)), totX + totW - 7, ty + 3.5, { align: 'right' });

  y = ty + 20;

  // ─── Legal Mentions ───────────────────────────────────────────────────────
  const DEFAULT_LEGAL_LINES = [
    'Produits à base de cannabidiol (CBD) conformes à la réglementation européenne et française.',
    'Taux de THC inférieur à 0,3% — Conforme au décret n° 2022-194 du 17 février 2022.',
    'Destiné à un usage exclusivement réservé aux personnes majeures (18+). N\'est pas un médicament.',
  ];
  const customLegalLines = (settings.invoice_legal_text || '')
    .split('\n').map(l => l.trim()).filter(Boolean);
  const legalBody = customLegalLines.length > 0 ? customLegalLines : DEFAULT_LEGAL_LINES;

  const legal = [
    `${company.name} — SIRET : ${company.siret ?? 'N/A'} — N° TVA : ${company.tvaIntra ?? 'N/A'}`,
    ...legalBody,
    `Facture ${isPaid ? 'acquittée' : 'en attente de paiement'} — émise le ${formatDate(order.created_at)}.`,
  ];

  const legalH = 15 + legal.length * 5;
  doc.setFillColor(...zinc50);
  doc.setDrawColor(...zinc200);
  doc.roundedRect(margin, y, contentWidth, legalH, 3, 3, 'FD');

  doc.setFillColor(...zinc100);
  doc.roundedRect(margin, y, contentWidth, 7, 3, 3, 'F');
  doc.rect(margin, y + 4, contentWidth, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...zinc800);
  doc.text('INFORMATIONS LÉGALES', margin + 5, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...zinc500);

  legal.forEach((line, i) => {
    doc.text(line, margin + 5, y + 13 + i * 5);
  });

  // ─── Footer ───────────────────────────────────────────────────────────────
  const footerY = pageHeight - 12;
  doc.setFillColor(...headerDark);
  doc.rect(0, footerY - 4, pageWidth, 16, 'F');
  doc.setFillColor(...green);
  doc.rect(0, footerY - 4, sidebarW, 16, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(180, 180, 180);
  doc.text(
    `${company.name}  ·  ${company.address}  ·  ${company.phone}${company.email ? '  ·  ' + company.email : ''}`,
    pageWidth / 2,
    footerY + 1,
    { align: 'center' }
  );
  doc.setTextColor(...neonGreen);
  doc.text(`N° ${invoiceNumber}`, pageWidth / 2, footerY + 5.5, { align: 'center' });

  return doc;
}

export async function downloadInvoice(order: Order, companyOverrides?: Partial<InvoiceCompanyInfo>): Promise<void> {
  const doc = await generateInvoicePDF(order, companyOverrides);
  const invoiceNumber = generateInvoiceNumber(order);
  doc.save(`Facture_${invoiceNumber}.pdf`);
}

export { generateInvoiceNumber, TVA_RATE, formatCurrency };
export type { InvoiceCompanyInfo };
