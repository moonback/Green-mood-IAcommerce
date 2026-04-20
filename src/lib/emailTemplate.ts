export interface EmailTemplateData {
  userName: string;
  userEmail: string;
  storeName: string;
  budtenderName: string;
  startedAt: Date;
  durationSec: number;
  products: Array<{ id: string; name: string; price: number; slug: string }>;
  catalogueBaseUrl?: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function renderEmailTemplate(data: EmailTemplateData): string {
  const {
    userName,
    storeName,
    budtenderName,
    startedAt,
    durationSec,
    products,
    catalogueBaseUrl = 'https://green-mood.fr/catalogue',
  } = data;

  const dateStr = formatDate(startedAt);
  const durationStr = formatDuration(durationSec);

  const productRows =
    products.length > 0
      ? products
          .map(
            (p) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
            <a href="${catalogueBaseUrl}/${p.slug}" style="color:#16a34a;text-decoration:none;font-weight:500;">${p.name}</a>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;color:#374151;">
            ${p.price.toFixed(2)} €
          </td>
        </tr>`
          )
          .join('')
      : `<tr><td colspan="2" style="padding:8px 0;color:#6b7280;font-style:italic;">Aucun produit recommandé</td></tr>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Résumé de votre session BudTender — ${storeName}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:#16a34a;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${storeName}</h1>
              <p style="margin:8px 0 0;color:#bbf7d0;font-size:14px;">Résumé de votre session avec ${budtenderName}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;font-size:16px;">Bonjour <strong>${userName}</strong>,</p>
              <p style="margin:0 0 24px;color:#374151;line-height:1.6;">
                Merci d'avoir utilisé le BudTender IA de <strong>${storeName}</strong>.
                Voici le résumé de votre session du <strong>${dateStr}</strong> (durée : ${durationStr}).
              </p>

              <!-- Session info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;padding:16px;margin-bottom:24px;">
                <tr>
                  <td style="padding:4px 0;color:#374151;font-size:14px;">
                    <strong>Date :</strong> ${dateStr}
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#374151;font-size:14px;">
                    <strong>Durée :</strong> ${durationStr}
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#374151;font-size:14px;">
                    <strong>Conseiller :</strong> ${budtenderName}
                  </td>
                </tr>
              </table>

              <!-- Recommended products -->
              <h2 style="margin:0 0 12px;font-size:16px;color:#111827;">Produits recommandés</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                ${productRows}
              </table>

              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
                Cliquez sur un produit pour le retrouver dans notre catalogue.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                Cet email a été envoyé automatiquement par ${storeName}.<br />
                Vous recevez ce message car vous avez utilisé notre BudTender IA.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
