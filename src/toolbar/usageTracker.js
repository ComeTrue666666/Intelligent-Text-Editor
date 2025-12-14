// toolbar/usageTracker.js
// Tracks how often and how recently each toolbar tool is used.
// Data is stored in localStorage so it persists across sessions.

(function (global) {
  const STORAGE_KEY = 'adaptive_editor_tool_usage_v1';

  function safeNow() {
    return Date.now ? Date.now() : new Date().getTime();
  }

  function loadRawUsage() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      // Ensure it's an object
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
      return {};
    } catch (e) {
      console.warn('[usageTracker] Failed to read usage from localStorage:', e);
      return {};
    }
  }

  function saveRawUsage(usage) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
    } catch (e) {
      console.warn('[usageTracker] Failed to write usage to localStorage:', e);
    }
  }

  /**
   * Log a usage event for a given tool.
   * @param {string} toolId
   */
  function logUsage(toolId) {
    if (!toolId) return;

    const usage = loadRawUsage();
    const now = safeNow();

    if (!usage[toolId]) {
      usage[toolId] = {
        count: 0,
        lastUsed: 0,
      };
    }

    usage[toolId].count += 1;
    usage[toolId].lastUsed = now;

    saveRawUsage(usage);
  }

  /**
   * Get usage stats as a map:
   * {
   *   [toolId]: { count: number, lastUsed: timestamp }
   * }
   */
  function getUsageStats() {
    return loadRawUsage();
  }

  /**
   * Optional: clear all usage (for debugging / reset).
   */
  function resetUsage() {
    saveRawUsage({});
  }

  /**
   * Optional helper: get stats for a single tool.
   */
  function getToolUsage(toolId) {
    const stats = loadRawUsage();
    return stats[toolId] || { count: 0, lastUsed: 0 };
  }

  const api = {
    logUsage,
    getUsageStats,
    getToolUsage,
    resetUsage,
  };

  // Expose globally
  global.usageTracker = api;
})(window);
