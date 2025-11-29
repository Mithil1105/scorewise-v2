import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface PageLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  className?: string;
}

export const PageLayout = ({ children, showNav = true, className = "" }: PageLayoutProps) => {
  return (
    <div className={`min-h-screen bg-background ${className}`}>
      <main className={showNav ? "pb-20" : ""}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
};
