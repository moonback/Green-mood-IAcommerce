// ─── Database Types ─────────────────────────────────────────────────────────

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  // Hierarchy fields (added in migration 20260320_category_hierarchy.sql)
  parent_id?: string | null;       // null/undefined = root category
  depth?: number;                  // 0 = root, 1 = sub, 2 = sub-sub (default 0)
  // Client-side enrichment (populated by buildCategoryTree)
  children?: CategoryNode[];
  parent?: Category;
  products?: { count: number }[] | { count: number };
}

/** A Category node with children always present (may be empty []). Used after buildCategoryTree(). */
export type CategoryNode = Category & { children: CategoryNode[] };

export interface Product {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  sku: string | null;
  description: string | null;
  weight_grams: number | null;    // used for machine weight in kg
  price: number;
  original_value: number | null;  // prix total des articles séparés
  image_url: string | null;
  stock_quantity: number;
  is_available: boolean;
  is_featured: boolean;
  is_active: boolean;
  is_bundle: boolean;
  is_subscribable: boolean;
  cbd_percentage: number | null;
  thc_max: number | null;
  attributes: {
    // Leisure machine specs
    specs?: string[];           // ex: ["Écran 32\" HD", "2 joueurs simultanés", "Monnayeur inclus"]
    connectivity?: string[];    // ex: ["Wi-Fi", "Ethernet", "USB", "HDMI"]
    dimensions?: string;        // ex: "65 x 75 x 180 cm"
    players?: number;           // nombre de joueurs simultanés
    power_watts?: number;       // consommation en watts
    brand?: string;             // ex: "Stern", "Atari", "Raw Thrills"
    year?: number;              // année de fabrication
    // Generic attributes
    benefits?: string[];        // points forts/avantages
    seo_title?: string;         // titre SEO généré
    seo_meta_description?: string; // meta description SEO générée
    /**
     * Grouped technical specifications for "all types of products".
     * Replaces or extends the old flat 'specs' array.
     */
    technical_specs?: {
      group: string;
      items: {
        label: string;
        value: string;
        icon?: string;
        description?: string;
      }[];
    }[];
    [key: string]: any;
  };
  embedding?: number[] | string | null;
  created_at: string;
  // joined
  category?: Category;
  bundle_items?: BundleItem[]; // populated on detail page
  // computed (from reviews batch query)
  avg_rating?: number;
  review_count?: number;
}

export interface BundleItem {
  id: string;
  bundle_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  // joined
  product?: Pick<Product, 'id' | 'name' | 'slug' | 'price' | 'image_url' | 'attributes'>;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  loyalty_points: number;
  referral_code: string | null;
  referred_by_id: string | null;
  is_admin: boolean;
  birthday: string | null;
  last_birthday_gift_at: string | null;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referee_id: string;
  status: 'joined' | 'completed';
  reward_issued: boolean;
  points_awarded: number;
  created_at: string;
  // joined
  referrer?: Pick<Profile, 'full_name'>;
  referee?: Pick<Profile, 'full_name' | 'created_at'>;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  street: string;
  city: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type DeliveryType = 'click_collect' | 'delivery' | 'in_store';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  id: string;
  user_id: string | null;
  status: OrderStatus;
  delivery_type: DeliveryType;
  address_id: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  loyalty_points_earned: number;
  loyalty_points_redeemed: number;
  promo_code: string | null;
  promo_discount: number;
  viva_order_code: string | null;
  stripe_payment_intent_id?: string | null;
  payment_method?: string | null;
  payment_status: PaymentStatus;
  notes: string | null;
  created_at: string;
  // joined
  address?: Address;
  order_items?: OrderItem[];
  profile?: Profile;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  // joined
  product?: Product;
}

export interface StockMovement {
  id: string;
  product_id: string;
  quantity_change: number;
  type: 'sale' | 'restock' | 'adjustment' | 'return';
  note: string | null;
  created_at: string;
  // joined
  product?: Product;
}

// ─── Cart Types ──────────────────────────────────────────────────────────────

export interface CartItem {
  product: Product;
  quantity: number;
  subscriptionFrequency?: SubscriptionFrequency;
}

// ─── Payment Types ────────────────────────────────────────────────────────────

export interface CreateOrderPayload {
  orderId: string;
  amount: number; // en centimes
  customerEmail: string;
  customerName: string;
  description: string;
}

export interface VivaOrderResponse {
  orderCode: number;
}

// ─── Phase 3 Types ────────────────────────────────────────────────────────────

export type LoyaltyTransactionType = 'earned' | 'redeemed' | 'referral' | 'adjusted' | 'expired';

export interface LoyaltyTransaction {
  id: string;
  user_id: string;
  order_id: string | null;
  type: LoyaltyTransactionType;
  points: number;
  balance_after: number;
  note: string | null;
  created_at: string;
  // joined
  order?: Pick<Order, 'id' | 'created_at' | 'total'>;
}

export type SubscriptionFrequency = 'weekly' | 'biweekly' | 'monthly';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

export interface Subscription {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  frequency: SubscriptionFrequency;
  next_delivery_date: string;
  status: SubscriptionStatus;
  created_at: string;
  // joined
  product?: Product;
  profile?: Pick<Profile, 'id' | 'full_name'>;
}

export interface SubscriptionOrder {
  id: string;
  subscription_id: string;
  order_id: string;
  created_at: string;
  // joined
  order?: Order;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  is_published: boolean;
  created_at: string;
  // joined
  profile?: Pick<Profile, 'full_name'>;
  product?: Pick<Product, 'id' | 'name' | 'slug' | 'image_url'>;
}

// ─── Analytics Types ──────────────────────────────────────────────────────────

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

export interface OrderStatusDistribution {
  status: string;
  count: number;
}

export interface CustomerAcquisitionPoint {
  date: string;
  new_customers: number;
}

export interface FunnelStep {
  step: string;
  sessions: number;
  pct: number;
}

export interface AbandonmentPoint {
  date: string;
  abandoned: number;
  converted: number;
}

export interface CustomerLTV {
  user_id: string;
  name: string;
  email: string;
  total_revenue: number;
  order_count: number;
  first_order_at: string;
  avg_order_value: number;
}

export interface CohortRow {
  cohort: string;     // "YYYY-MM"
  members: number;
  m0: number;
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  m5: number;
}

export interface PageViewEntry {
  page: string;
  views: number;
}

export interface TrafficSource {
  source: string;
  count: number;
}

// ─── AI Preferences Types ─────────────────────────────────────────────────────

export interface UserAIPreferences {
  id: string;
  user_id: string;
  goal: string | null;           // ex: 'sleep', 'stress', 'pain'
  experience_level: string | null; // ex: 'beginner', 'intermediate', 'expert'
  preferred_format: string | null; // ex: 'oil', 'flower', 'infusion'
  budget_range: string | null;   // 'low', 'mid', 'high'
  updated_at: string | null;
  age_range: string | null;      // 'adult', 'senior'
  intensity_preference: string | null; // 'low', 'mid', 'high'
  terpene_preferences?: string[] | null; // ex: ['limonene', 'myrcene']
  extra_prefs: Record<string, any> | null;
}

// Kept for DB compatibility — not used in arcade/leisure context
export interface CannabisCondition {
  id: string;
  condition: string;
  alternate_name: string | null;
  evidence_score: number;
  popular_interest: number | null;
  scholar_citations: number | null;
  cbd_effect: string | null;
  simple_notes: string | null;
  scientific_notes: string | null;
  study_link: string | null;
  source_name: string | null;
  created_at: string;
  vector?: CannabisConditionVector;
}

// Kept for DB compatibility
export interface CannabisConditionVector {
  id: string;
  condition_id: string;
  embedding: number[] | string;
  text_content: string;
  created_at: string;
}
