import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-outline',
  ghost: 'btn text-gray-300 hover:bg-white/[0.06] hover:text-white',
  danger: 'btn-danger'
}

const SIZES = {
  sm: 'h-9 px-3.5 text-xs rounded-xl',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-[15px]'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(VARIANTS[variant], SIZES[size], className)}
      {...props}
      disabled={isLoading || props.disabled}
      aria-busy={isLoading || undefined}
    >
      {isLoading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin-smooth" />}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
