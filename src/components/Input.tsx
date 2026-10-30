import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  /** Element shown inside the field on the right (unit, button). */
  trailing?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, trailing, id, ...props }, ref) => {
    const generated = React.useId()
    const inputId = id ?? generated
    return (
      <div className="w-full">
        {label && <label htmlFor={inputId} className="field-label">{label}</label>}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            className={cn('input-field', trailing && 'pr-16', error && 'border-danger/70 focus:border-danger', className)}
            {...props}
          />
          {trailing && <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">{trailing}</div>}
        </div>
        {error && <p className="text-[11px] text-danger mt-1.5 ml-1">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
