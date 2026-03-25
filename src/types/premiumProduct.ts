import type { Product as BaseProduct, Review as BaseReview } from '../lib/types';

/** A single machine specification (shown in the interactive specs viewer) */
export interface MachineSpec {
  name: string;
  icon: string;
  category: string;    // spec category label (e.g. "Affichage", "Connectivité")
  description: string;
  intensity: number;    // 0-100, used for the progress bar
}

export interface Review extends Pick<BaseReview, 'id' | 'rating' | 'comment' | 'created_at'> {
  author: string;
  highlight?: string;
  photoUrl?: string;
}

export interface Product extends BaseProduct {
  headline: string;
  shortDescription: string;
  /** Quick feature tags shown as chips under the product title */
  techFeatures: string[];
  /** 0-10 machine metrics used for the performance visualization */
  machineMetrics: Record<'Performance' | 'Durabilité' | 'Immersion' | 'Prix-qualité', number>;
  /** Machine specifications (shown in the interactive spec viewer) */
  machineSpecs: MachineSpec[];
}
