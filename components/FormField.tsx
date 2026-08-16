import { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const baseInput =
  "bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition placeholder:text-slate-600 w-full";

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}

/** Envolve um input/select com um <label> acessível — sem depender só de placeholder */
export function FieldWrapper({ label, htmlFor, className, children }: FieldWrapperProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-500 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInput} ${className ?? ""}`} />;
}

export function SelectInput({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${baseInput} ${className ?? ""}`}>
      {children}
    </select>
  );
}
