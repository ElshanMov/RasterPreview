import type { ReactNode } from "react";

export interface MenuItem {
  label: string | ReactNode;
  icon: ReactNode;
  path: string; 
}