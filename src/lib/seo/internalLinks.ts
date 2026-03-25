import { Product } from '../types';

export function buildInternalLinks(product?: Product) {
  const guideLinks = [
    { label: 'Guide Entretien Arcade', to: '/guides/entretien-machine-arcade' },
    { label: 'Guide Installation Flipper', to: '/guides/installation-flipper' },

  ];

  const productLinks = product
    ? [
        { label: `Voir la gamme ${product.category?.name ?? 'Loisirs'}`, to: '/catalogue' },
        { label: 'Machines liées', to: '/produits' },
      ]
    : [];

  return [...productLinks, ...guideLinks];
}
