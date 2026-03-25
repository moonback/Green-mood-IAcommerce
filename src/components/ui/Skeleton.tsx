/**
 * Skeleton loading components.
 * Use these while async data is loading to prevent layout shift
 * and give users immediate visual feedback.
 */

interface SkeletonProps {
    className?: string;
    rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const roundedMap = {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
};

/** Base shimmer block */
export function Skeleton({ className = '', rounded = 'md' }: SkeletonProps) {
    return (
        <div
            className={`
        bg-white/[0.06] relative overflow-hidden
        before:absolute before:inset-0
        before:bg-gradient-to-r before:from-transparent before:via-white/[0.08] before:to-transparent
        before:translate-x-[-100%] before:animate-shimmer
        ${roundedMap[rounded]}
        ${className}
      `}
            aria-hidden="true"
        />
    );
}

/** Skeleton for a single ProductCard */
export function ProductCardSkeleton() {
    return (
        <div className="bg-zinc-900/30 rounded-[2rem] border border-white/[0.06] overflow-hidden">
            {/* Image area */}
            <Skeleton className="w-full aspect-square" rounded="sm" />
            {/* Content */}
            <div className="p-5 space-y-3">
                <Skeleton className="h-4 w-1/3" rounded="full" />
                <Skeleton className="h-5 w-4/5" rounded="md" />
                <Skeleton className="h-3.5 w-1/2" rounded="full" />
                <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-7 w-20" rounded="lg" />
                    <Skeleton className="h-10 w-10 rounded-2xl" rounded="2xl" />
                </div>
            </div>
        </div>
    );
}

/** Skeleton for a product grid (n cards) */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <ProductCardSkeleton key={i} />
            ))}
        </div>
    );
}

/** Skeleton for the header search bar */
export function SearchBarSkeleton() {
    return <Skeleton className="h-10 w-full max-w-xl" rounded="full" />;
}

/** Skeleton for a hero banner */
export function HeroSkeleton() {
    return (
        <div className="w-full min-h-[520px] md:min-h-[640px] rounded-[2rem] overflow-hidden relative">
            <Skeleton className="absolute inset-0" rounded="2xl" />
        </div>
    );
}

/** Skeleton for a category card */
export function CategoryCardSkeleton() {
    return (
        <div className="rounded-[2rem] overflow-hidden border border-white/[0.06]">
            <Skeleton className="w-full aspect-[4/3]" rounded="sm" />
            <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" rounded="md" />
                <Skeleton className="h-3 w-1/2" rounded="full" />
            </div>
        </div>
    );
}

/** Skeleton for a review card */
export function ReviewSkeleton() {
    return (
        <div className="p-5 rounded-2xl border border-white/[0.06] space-y-3">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10" rounded="full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-28" rounded="md" />
                    <Skeleton className="h-3 w-20" rounded="full" />
                </div>
            </div>
            <Skeleton className="h-3 w-full" rounded="md" />
            <Skeleton className="h-3 w-4/5" rounded="md" />
        </div>
    );
}