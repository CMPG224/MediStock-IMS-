"use client"

import {useId, type ReactNode} from "react";
import Icon from "./Icon";

type TextFieldProps = {
    label: string;
    icon?: string;
    value: string;
    onChange: (value: string) => void;
    type?: "text" | "password" | "email" ;
    placeholder?: string;
    error?: string;
    className?: string;
    children?: ReactNode;
    labelAction?: ReactNode;
    trailing?: ReactNode;
    autoComplete?: string;
    required?: boolean;

};

export default function TextField({
    label,
    icon,
    value,
    required=false,
    onChange,
    type = "text",
    placeholder,
    error,
    className,
    children,
    labelAction,
    trailing,
    autoComplete,
}: TextFieldProps) {
    const id = useId();
    const errorId = error ? `${id}-error` : undefined;

    return (
        <div className={`flex flex-col gap-2`}>
            <div className={`flex items-center justify-between`}>
                <label htmlFor={id} className="text-2xl font-bold tracking-[.09em] text-label">
                    {label}
                    {required && <span className="text-danger">*</span>}
                </label>
                {labelAction}
            </div>

            <div className={`flex items-center gap-2 rounded-lg border border-border bg-page px-3 py-2 ${className}`}>
                {icon && <Icon name={icon} size={16} className="text-muted" />}
                <input
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    type={type}
                    placeholder={placeholder}
                    aria-required={required}
                    aria-invalid={error ? "true" : undefined}
                    aria-describedby={error ? errorId : undefined}
                    autoComplete={autoComplete}
                    className="flex-1 bg-transparent outline-none"
                />
                {trailing}
            </div>
            {error && (
                <span id={errorId} role="alert" className="text-sm font-semibold text-danger">
                    {error}
                </span>
            )}
        </div>
    );
}
