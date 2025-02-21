import type { JSX } from 'preact';
import { LoaderCircle } from 'lucide-preact';
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary' | 'accent' | 'link' | 'destructive' | 'warning';
type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';

interface BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

interface ButtonAsButton extends JSX.HTMLAttributes<HTMLButtonElement>, BaseButtonProps {
  href?: undefined;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

interface ButtonAsAnchor extends JSX.HTMLAttributes<HTMLAnchorElement>, BaseButtonProps {
  href: string;
  type?: undefined;
  disabled?: undefined;
}

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

export default function Button({
  variant = 'default',
  size = 'default',
  loading = false,
  disabled = false,
  href,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const baseClassName = cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-base font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neutral focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 cursor-pointer',
    size === 'sm' && 'h-9 px-3',
    size === 'default' && 'h-10 px-4 py-2',
    size === 'lg' && 'h-11 px-8',
    size === 'icon' && 'h-10 w-10',
    // Main variants using semantic colors
    variant === 'default' && 'bg-primary text-primary-content hover:bg-primary/90',
    variant === 'secondary' && 'bg-secondary text-secondary-content hover:bg-secondary/90',
    variant === 'accent' && 'bg-accent text-accent-content hover:bg-accent/90',
    variant === 'warning' && 'bg-warning text-warning-content hover:bg-warning/90',
    variant === 'destructive' && 'bg-error text-error-content hover:bg-error/90',
    // Special variants
    variant === 'outline' &&
      'border border-base-content/20 text-base-content hover:bg-base-content hover:text-base-100',
    variant === 'ghost' && 'text-base-content hover:bg-base-300',
    variant === 'link' && 'text-primary underline-offset-4 hover:underline',
    className,
  );

  const content = loading ? (
    <div className='flex items-center gap-2'>
      <LoaderCircle class='animate-spin' />
      {children}
    </div>
  ) : (
    children
  );

  if (href) {
    return (
      <a href={href} className={baseClassName} {...(rest as JSX.HTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </a>
    );
  }

  return (
    <button
      type={type as ButtonAsButton['type']}
      className={baseClassName}
      disabled={disabled || loading}
      {...(rest as JSX.HTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
}
