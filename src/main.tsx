import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress Chrome extension errors (harmless but annoying)
// These errors occur when browser extensions try to communicate with the page
// but the connection closes before a response is received
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args: any[]) => {
  const errorMessage = args.join(' ') || '';
  
  // Suppress Chrome extension errors
  if (
    errorMessage.includes('runtime.lastError') ||
    errorMessage.includes('message port closed') ||
    errorMessage.includes('Extension context invalidated') ||
    errorMessage.includes('Receiving end does not exist') ||
    errorMessage.includes('Unchecked runtime.lastError') ||
    errorMessage.includes('The message port closed before a response was received')
  ) {
    // Silently ignore these extension errors
    return;
  }
  
  // Log all other errors normally
  originalError.apply(console, args);
};

console.warn = (...args: any[]) => {
  const warningMessage = args.join(' ') || '';
  
  // Suppress Chrome extension warnings
  if (
    warningMessage.includes('runtime.lastError') ||
    warningMessage.includes('message port closed') ||
    warningMessage.includes('Extension context invalidated')
  ) {
    // Silently ignore these extension warnings
    return;
  }
  
  // Log all other warnings normally
  originalWarn.apply(console, args);
};

// Also catch unhandled promise rejections from extensions
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.message || event.reason?.toString() || '';
  
  if (
    errorMessage.includes('runtime.lastError') ||
    errorMessage.includes('message port closed') ||
    errorMessage.includes('Extension context invalidated') ||
    errorMessage.includes('Receiving end does not exist')
  ) {
    // Prevent the error from showing in console
    event.preventDefault();
    return;
  }
});

// Catch general errors from extensions
window.addEventListener('error', (event) => {
  const errorMessage = event.message || event.error?.message || '';
  
  if (
    errorMessage.includes('runtime.lastError') ||
    errorMessage.includes('message port closed') ||
    errorMessage.includes('Extension context invalidated') ||
    errorMessage.includes('Receiving end does not exist') ||
    errorMessage.includes('chrome-extension://') ||
    errorMessage.includes('moz-extension://')
  ) {
    // Prevent the error from showing in console
    event.preventDefault();
    return;
  }
});

createRoot(document.getElementById("root")!).render(<App />);
