export const DEFAULT_PRODUCT_IMAGE = '/images/presentation.png';

export function getProductImageSrc(imageUrl?: string | null) {
  return imageUrl?.trim() ? imageUrl : DEFAULT_PRODUCT_IMAGE;
}

export function applyProductImageFallback(event: { currentTarget: HTMLImageElement }) {
  const image = event.currentTarget;

  if (image.dataset.fallbackApplied === 'true') {
    return;
  }

  image.dataset.fallbackApplied = 'true';
  image.src = DEFAULT_PRODUCT_IMAGE;
}
