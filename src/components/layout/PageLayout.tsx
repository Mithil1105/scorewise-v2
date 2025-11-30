import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";

interface PageLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  showFooter?: boolean;
  className?: string;
}

export const PageLayout = ({ children, showNav = true, showFooter = true, className = "" }: PageLayoutProps) => {
  return (
    <div className={`min-h-screen bg-background flex flex-col ${className}`}>
      <main className={`flex-1 ${showNav ? "pb-20" : ""}`}>
        {children}
      </main>
      {showFooter && <Footer />}
      {showNav && <BottomNav />}
    </div>
  );
};
