import eventBus from './eventBus';

export const initializeConsoleInterceptor = () => {
  // FIX: Narrow the type of `levels` to only the specific keys we're intercepting.
  const levels: ('log' | 'warn' | 'error' | 'debug')[] = ['log', 'warn', 'error', 'debug'];

  levels.forEach(level => {
    const original = console[level];
    // FIX: Cast `console` to `any` to allow dynamic assignment.
    // TypeScript has a very specific and complex type for the global `console` object,
    // which prevents direct assignment to its methods. This is a standard way to
    // monkey-patch objects in TypeScript without causing type errors.
    (console as any)[level] = (...args: any[]) => {
      // Call original console method
      original.apply(console, args);

      // Format message for display
      const message = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return '[Unserializable Object]';
          }
        }
        return String(arg);
      }).join(' ');

      // Dispatch event for the UI
      eventBus.dispatch('consoleLog', {
        level,
        message,
        timestamp: new Date(),
      });
    };
  });

  console.log("Console interceptor initialized.");
};
