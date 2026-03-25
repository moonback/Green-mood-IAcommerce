import { motion } from 'motion/react';
import { Printer, RotateCcw } from 'lucide-react';
import { CompletedSale, PaymentMethod } from './types';
import { useSettingsStore } from '../../../store/settingsStore';

interface POSReceiptModalProps {
    sale: CompletedSale;
    storeName: string;
    storeAddress: string;
    storePhone: string;
    onClose: () => void;
    isLightTheme?: boolean;
}

export default function POSReceiptModal({
    sale,
    storeName,
    storeAddress,
    storePhone,
    onClose,
    isLightTheme
}: POSReceiptModalProps) {
    const { settings } = useSettingsStore();
    const currencyName = settings.loyalty_currency_name || 'pts';
    const pmLabel: Record<PaymentMethod, string> = {
        cash: 'Espèces',
        card: 'Carte bancaire',
        mobile: 'Paiement mobile',
    };

    const esc = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const handlePrint = () => {
        const win = window.open('', '_blank', 'width=400,height=600');
        if (!win) return;

        const linesHtml = sale.lines.map(l => `
            <div>
                <div class="row"><span class="bold">${esc(l.product.name)}</span></div>
                <div class="row">
                    <span>${esc(String(l.quantity))} &times; ${esc(l.unitPrice.toFixed(2))} &euro;</span>
                    <span>${esc((l.quantity * l.unitPrice).toFixed(2))} &euro;</span>
                </div>
            </div>`).join('');

        const discountHtml = sale.discount > 0
            ? `<div class="row"><span>Remise</span><span>&minus;${esc(sale.discount.toFixed(2))} &euro;</span></div>` : '';
        const promoHtml = (sale.promoDiscount != null && sale.promoDiscount > 0)
            ? `<div class="row"><span>Code promo (${esc(sale.promoCode ?? '')})</span><span>&minus;${esc(sale.promoDiscount.toFixed(2))} &euro;</span></div>` : '';
        const cashHtml = sale.cashGiven != null ? `
            <div class="row"><span>Re&ccedil;u</span><span>${esc(sale.cashGiven.toFixed(2))} &euro;</span></div>
            <div class="row bold"><span>Rendu</span><span>${esc((sale.change ?? 0).toFixed(2))} &euro;</span></div>` : '';
        const loyaltyGainedHtml = (sale.loyaltyGained !== undefined && sale.loyaltyGained > 0)
            ? `<div class="divider"></div><div class="center bold italic">Points gagn&eacute;s: +${esc(String(sale.loyaltyGained))} ${esc(currencyName)}</div>` : '';
        const loyaltyRedeemedHtml = (sale.loyaltyRedeemed !== undefined && sale.loyaltyRedeemed > 0)
            ? `<div class="divider"></div><div class="center bold italic" style="color:red">Points utilis&eacute;s: -${esc(String(sale.loyaltyRedeemed))} ${esc(currencyName)}</div>` : '';

        const html = `<!doctype html><html><head><title>Re&ccedil;u</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: monospace; font-size: 13px; }
  body { padding: 16px; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .divider { border-top: 1px dashed #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; }
  .big { font-size: 16px; font-weight: bold; }
  .italic { font-style: italic; }
</style></head><body>
<div class="center bold">${esc(storeName)}</div>
<div class="center">${esc(storeAddress)}</div>
<div class="center">${esc(storePhone)}</div>
<div class="divider"></div>
<div class="center">TICKET DE CAISSE</div>
<div class="center">${esc(sale.timestamp.toLocaleString('fr-FR'))}</div>
<div class="center">N&deg; ${esc(sale.shortId)}</div>
<div class="divider"></div>
${linesHtml}
<div class="divider"></div>
<div class="row"><span>Sous-total</span><span>${esc(sale.subtotal.toFixed(2))} &euro;</span></div>
${discountHtml}${promoHtml}
<div class="row big"><span>TOTAL</span><span>${esc(sale.total.toFixed(2))} &euro;</span></div>
<div class="divider"></div>
<div class="row"><span>Paiement</span><span>${esc(pmLabel[sale.paymentMethod])}</span></div>
${cashHtml}
<div class="divider"></div>
<div class="center italic">&#9851; ${esc(storeName)}</div>
${loyaltyGainedHtml}${loyaltyRedeemedHtml}
</body></html>`;

        win.document.write(html);
        win.document.close();
        win.print();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`border rounded-xl p-3 sm:p-4 w-full max-w-sm shadow-2xl transition-all ${isLightTheme ? 'bg-white border-emerald-100' : 'bg-zinc-900 border border-zinc-700'}`}
            >
                {/* Receipt printable zone */}
                <div className={`rounded-lg p-3 mb-3 font-mono text-[10px] sm:text-xs leading-relaxed border transition-all ${isLightTheme ? 'bg-emerald-50/50 text-emerald-950 border-emerald-100' : 'bg-white text-black'}`}>
                    <div className="center bold text-sm">{storeName}</div>
                    <div className="center">{storeAddress}</div>
                    <div className="center">{storePhone}</div>
                    <div className="divider" />
                    <div className="center">TICKET DE CAISSE</div>
                    <div className="center">{sale.timestamp.toLocaleString('fr-FR')}</div>
                    <div className="center">N° {sale.shortId}</div>
                    <div className="divider" />
                    {sale.lines.map((l, i) => (
                        <div key={i}>
                            <div className="row">
                                <span className="bold">{l.product.name}</span>
                            </div>
                            <div className="row">
                                <span>{l.quantity} × {l.unitPrice.toFixed(2)} €</span>
                                <span>{(l.quantity * l.unitPrice).toFixed(2)} €</span>
                            </div>
                        </div>
                    ))}
                    <div className="divider" />
                    <div className="row"><span>Sous-total</span><span>{sale.subtotal.toFixed(2)} €</span></div>
                    {sale.discount > 0 && (
                        <div className="row"><span>Remise</span><span>−{sale.discount.toFixed(2)} €</span></div>
                    )}
                    {sale.promoDiscount != null && sale.promoDiscount > 0 && (
                        <div className="row"><span>Code promo ({sale.promoCode})</span><span>−{sale.promoDiscount.toFixed(2)} €</span></div>
                    )}
                    <div className="row big"><span>TOTAL</span><span>{sale.total.toFixed(2)} €</span></div>
                    <div className="divider" />
                    <div className="row"><span>Paiement</span><span>{pmLabel[sale.paymentMethod]}</span></div>
                    {sale.cashGiven != null && (
                        <>
                            <div className="row"><span>Reçu</span><span>{sale.cashGiven.toFixed(2)} €</span></div>
                            <div className="row bold"><span>Rendu</span><span>{(sale.change ?? 0).toFixed(2)} €</span></div>
                        </>
                    )}
                    <div className="divider" />
                    <div className="center italic">♻ {storeName}</div>
                    {sale.loyaltyGained !== undefined && sale.loyaltyGained > 0 && (
                        <>
                            <div className="divider" />
                            <div className="center bold italic">Points gagnés: +{sale.loyaltyGained} {currencyName}</div>
                        </>
                    )}
                    {sale.loyaltyRedeemed !== undefined && sale.loyaltyRedeemed > 0 && (
                        <>
                            <div className="divider" />
                            <div className="center bold italic text-red-600">Points utilisés: -{sale.loyaltyRedeemed} {currencyName}</div>
                        </>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <button
                        onClick={handlePrint}
                        className={`flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-lg font-bold text-xs transition-all ${isLightTheme ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20' : 'bg-green-500 hover:bg-green-600 text-black'}`}
                    >
                        <Printer className="w-3.5 h-3.5" />
                        Imprimer
                    </button>
                    <button
                        onClick={onClose}
                        className={`flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-lg font-bold text-xs transition-all ${isLightTheme ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-100' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Fermer
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
