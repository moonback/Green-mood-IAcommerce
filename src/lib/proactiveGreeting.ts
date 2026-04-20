interface ProductForGreeting {
  name: string;
  price: number;
  cbd_percentage?: number | null;
  category?: { name: string } | null;
}

interface SettingsForGreeting {
  budtender_name?: string;
}

export function buildProactiveGreeting(product: ProductForGreeting, settings?: SettingsForGreeting | null): string {
  const name = product.name;
  const cbd = product.cbd_percentage;
  const price = product.price.toFixed(2);
  const category = product.category?.name || 'CBD';
  const budtenderName = settings?.budtender_name || 'BudTender';

  return `Bonjour ! Je vois que vous consultez ${name}${cbd ? ` (${cbd}% CBD)` : ''} à ${price}€. Puis-je vous aider à en savoir plus sur ses effets, son dosage ou vous proposer des alternatives dans la catégorie ${category} ?`;
}
