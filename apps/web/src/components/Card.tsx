import type { ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return <div className={`rounded-2xl border border-line bg-card p-4 shadow-sm ${className}`}>{children}</div>;
}
