// ═══════════════════════════════════════════════════
//  Vercel Speed Insights - Performance Monitoring
//  Archivo: js/speed-insights.js
// ═══════════════════════════════════════════════════

// Import from CDN for static site compatibility
import { injectSpeedInsights } from 'https://cdn.jsdelivr.net/npm/@vercel/speed-insights@1/dist/index.mjs';

// Initialize Speed Insights with optional configuration
// This will track Core Web Vitals and page performance metrics
injectSpeedInsights({
  // Enable debug mode in development
  debug: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
  // Sample rate (1 = 100% of page views)
  sampleRate: 1,
  // You can add beforeSend middleware here if needed to filter events
  // beforeSend: (event) => event
});

console.log('[Speed Insights] Initialized');
