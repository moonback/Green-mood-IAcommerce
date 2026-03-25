import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { buttonSize, buttonVariant } from '../../design-system/tokens';

type Variant = keyof typeof buttonVariant;
type Size = keyof typeof buttonSize;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    isLoading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    asMotion?: boolean;
}

const Spinner = () => (
    <svg
        className="animate-spin w-4 h-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
);

/**
 * Reusable Button component.
 * Wraps a <button> with consistent design-system variants and sizes.
 *
 * @example
 * <Button variant="primary" size="lg" leftIcon={<ShoppingCart />}>
 *   Ajouter au panier
 * </Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            asMotion,
            className = '',
            children,
            disabled,
            ...props
        },
        ref,
    ) => {
        const base =
            'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed select-none';

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={`${base} ${buttonSize[size]} ${buttonVariant[variant]} ${className}`}
                {...props}
            >
                {isLoading ? (
                    <Spinner />
                ) : (
                    leftIcon && <span className="shrink-0">{leftIcon}</span>
                )}
                {children && <span>{children}</span>}
                {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
            </button>
        );
    },
);

Button.displayName = 'Button';

/** Animated version using motion/react */
export const MotionButton = motion.create(Button);