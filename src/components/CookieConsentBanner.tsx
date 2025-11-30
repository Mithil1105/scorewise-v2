import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Cookie } from "lucide-react";
import { Link } from "react-router-dom";

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    localStorage.setItem("cookieConsentDate", new Date().toISOString());
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookieConsent", "declined");
    localStorage.setItem("cookieConsentDate", new Date().toISOString());
    setIsVisible(false);
    // Note: Essential cookies will still work, but user has declined non-essential
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 md:p-4 animate-in slide-in-from-bottom duration-300 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex-shrink-0 hidden sm:block">
            <Cookie className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1.5">
              We Use Cookies
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ScoreWise uses essential cookies for login sessions and secure account access. These are required for the service to work.{" "}
              <Link to="/cookies" className="text-primary hover:underline font-medium inline whitespace-nowrap">
                Learn more
              </Link>
            </p>
          </div>
          <div className="flex flex-row gap-2 w-full sm:w-auto sm:flex-shrink-0">
            <Button
              onClick={handleDecline}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-initial text-xs"
            >
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              size="sm"
              className="flex-1 sm:flex-initial text-xs"
            >
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

