import type { ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return <div className={`rounded-[14px] border border-line bg-card p-4 ${className}`}>{children}</div>;
}
