import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type ThemeMode = 'light' | 'dark' | 'vibrant';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => Promise<void>;
  cycleTheme: () => void;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'scorewise-theme';
const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'vibrant'];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [loading, setLoading] = useState(true);

  // Apply theme to document
  const applyTheme = (newTheme: ThemeMode) => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('light', 'dark', 'vibrant');
    
    // Add new theme class
    root.classList.add(newTheme);
    
    // Set data attribute for CSS targeting
    root.setAttribute('data-theme', newTheme);
  };

  // Load theme from localStorage first (for instant UI update)
  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (storedTheme && THEME_CYCLE.includes(storedTheme)) {
      setThemeState(storedTheme);
      applyTheme(storedTheme);
    }
    setLoading(false);
  }, []);

  // Load theme from database when user logs in
  useEffect(() => {
    if (!user) {
      // Guest user - use localStorage only
      return;
    }

    const loadThemeFromDB = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('theme_preference')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error loading theme from DB:', error);
          // Fallback to localStorage
          return;
        }

        if (data?.theme_preference && THEME_CYCLE.includes(data.theme_preference as ThemeMode)) {
          const dbTheme = data.theme_preference as ThemeMode;
          setThemeState(dbTheme);
          applyTheme(dbTheme);
          // Sync localStorage with DB
          localStorage.setItem(THEME_STORAGE_KEY, dbTheme);
        }
      } catch (err) {
        console.error('Error fetching theme:', err);
      }
    };

    loadThemeFromDB();
  }, [user]);

  // Set theme and persist
  const setTheme = async (newTheme: ThemeMode) => {
    if (!THEME_CYCLE.includes(newTheme)) {
      console.warn('Invalid theme mode:', newTheme);
      return;
    }

    // Apply theme immediately for instant feedback
    setThemeState(newTheme);
    applyTheme(newTheme);
    
    // Always save to localStorage (for guests and instant access)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);

    // Save to database if user is logged in
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ theme_preference: newTheme })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error saving theme to DB:', error);
          // Theme is still applied and saved in localStorage
        }
      } catch (err) {
        console.error('Error updating theme:', err);
        // Theme is still applied and saved in localStorage
      }
    }
  };

  // Cycle through themes
  const cycleTheme = () => {
    const currentIndex = THEME_CYCLE.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    const nextTheme = THEME_CYCLE[nextIndex];
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

