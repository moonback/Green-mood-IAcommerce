import { create } from 'zustand';
import { Product } from '../lib/types';
import { autoFillProductSync } from '../lib/productAI';
import { sleep, isQuotaError } from '../lib/utils';
import { useToastStore } from './toastStore';
import { generateEmbedding } from '../lib/embeddings';
import { supabase } from '../lib/supabase';

interface BackgroundTaskState {
    isSyncingAI: boolean;
    aiSyncProgress: { done: number; total: number } | null;
    startMassAIFill: (products: Product[], force: boolean, onRefresh?: () => void) => Promise<void>;
    isSyncingVectors: boolean;
    vectorSyncProgress: { done: number; total: number } | null;
    startVectorSync: (products: Product[], onRefresh?: () => void) => Promise<void>;
}

function buildEmbeddingText(product: Product): string {
    const specs = Array.isArray(product.attributes?.specs) ? product.attributes.specs.join(' ') : '';
    const benefits = Array.isArray(product.attributes?.benefits) ? product.attributes.benefits.join(' ') : '';
    return [
        product.name,
        product.description ?? '',
        product.attributes?.brand ? `Marque: ${product.attributes.brand}` : '',
        specs,
        benefits,
    ].filter(Boolean).join(' ').trim();
}

export const useBackgroundTaskStore = create<BackgroundTaskState>((set, get) => ({
    isSyncingAI: false,
    aiSyncProgress: null,
    isSyncingVectors: false,
    vectorSyncProgress: null,

    startMassAIFill: async (products, force, onRefresh) => {
        if (get().isSyncingAI || products.length === 0) return;

        set({
            isSyncingAI: true,
            aiSyncProgress: { done: 0, total: products.length }
        });

        let successCount = 0;
        let failedCount = 0;

        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            try {
                const success = await autoFillProductSync(product, force);
                if (success) {
                    successCount++;
                    if (onRefresh) onRefresh();
                } else {
                    failedCount++;
                }
            } catch (err) {
                console.error('[Background AI] Mass Fill Error:', err);
                failedCount++;
            } finally {
                set({ aiSyncProgress: { done: i + 1, total: products.length } });
            }
            // Small delay to avoid rate limits
            await sleep(400);
        }

        set({
            isSyncingAI: false,
            aiSyncProgress: null
        });

        const mode = force ? 'Régénération forcée' : 'Enrichissement';
        useToastStore.getState().addToast({
            message: `${mode} IA terminée: ${successCount} succès, ${failedCount} échecs.`,
            type: successCount > 0 ? 'success' : 'error'
        });
    },

    startVectorSync: async (products, onRefresh) => {
        if (get().isSyncingVectors || products.length === 0) return;

        set({ isSyncingVectors: true, vectorSyncProgress: { done: 0, total: products.length } });

        let successCount = 0;
        let failedCount = 0;
        let stoppedByQuota = false;

        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            try {
                const text = buildEmbeddingText(product);
                if (!text) throw new Error('Texte vide pour la génération du vecteur.');

                const embedding = await generateEmbedding(text);
                if (!embedding.length) throw new Error('Vecteur vide reçu depuis OpenRouter.');

                const { error } = await supabase.from('products').update({ embedding }).eq('id', product.id);
                if (error) throw error;

                successCount++;
                if (onRefresh) onRefresh();
            } catch (err) {
                failedCount++;
                if (isQuotaError(err)) {
                    stoppedByQuota = true;
                    break;
                }
            } finally {
                set({ vectorSyncProgress: { done: i + 1, total: products.length } });
            }
            await sleep(700);
        }

        set({ isSyncingVectors: false, vectorSyncProgress: null });

        const addToast = useToastStore.getState().addToast;
        if (stoppedByQuota) {
            addToast({ message: `Quota OpenRouter atteint. Sync interrompue après ${successCount} succès.`, type: 'error' });
        } else {
            addToast({
                message: `Sync vecteurs terminée: ${successCount}/${products.length} vectorisé(s). Échecs: ${failedCount}.`,
                type: successCount > 0 ? 'success' : 'error'
            });
        }
    },
}));
