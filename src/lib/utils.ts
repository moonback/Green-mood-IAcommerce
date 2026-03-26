export const slugify = (s: string) =>
    s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const isQuotaError = (error: unknown) => {
    const errorText = `${(error as { message?: string })?.message ?? ''} ${JSON.stringify(error ?? '')}`.toLowerCase();
    return errorText.includes('quota exceeded')
        || errorText.includes('resource_exhausted')
        || errorText.includes('too many requests')
        || errorText.includes('rate limit')
        || errorText.includes('code":429');
};

export const stripHtml = (html: string | null | undefined): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
};
