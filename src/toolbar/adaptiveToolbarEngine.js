// toolbar/adaptiveToolbarEngine.js
// Computes ranking of tools based on usage stats and chosen mode.

(function (global) {
  const MODES = {
    FREQUENCY: 'frequency',
    RECENCY: 'recency',
    COMBINED: 'combined',
    HIGHLIGHT_ONLY: 'highlight', // for future context-aware behavior
    FIXED: 'fixed',
  };

  /**
   * Compute a frequency-based score for a tool.
   * Higher usage count => higher score.
   */
  function frequencyScore(toolId, usageStats) {
    const stats = usageStats[toolId];
    if (!stats) return 0;
    return stats.count || 0;
  }

  /**
   * Compute a recency-based score.
   * More recent => higher score.
   * Simple decay based on age in hours.
   */
  function recencyScore(toolId, usageStats) {
    const stats = usageStats[toolId];
    if (!stats || !stats.lastUsed) return 0;

    const now = Date.now ? Date.now() : new Date().getTime();
    const ageMs = now - stats.lastUsed;
    const ageHours = ageMs / (1000 * 60 * 60);

    // Simple decay: score = 1 / (1 + ageHours)
    // Very recent use ≈ 1, old use approaches 0.
    return 1 / (1 + ageHours);
  }

  /**
   * Combined score: weighted sum of frequency + recency.
   * You can tweak weights if needed.
   */
  function combinedScore(toolId, usageStats) {
    const f = frequencyScore(toolId, usageStats);
    const r = recencyScore(toolId, usageStats);

    const frequencyWeight = 0.7;
    const recencyWeight = 0.3;

    return frequencyWeight * f + recencyWeight * r;
  }

  /**
   * Highlight-only mode:
   * For now this is a simple stub.
   * Idea: use context (selection, caret position) to prioritize certain tools.
   *
   * @param {Array} tools - list of tool definitions
   * @param {Object} context - info about current selection/caret (optional)
   */
  function highlightOnlySort(tools, usageStats, context) {
    // Simple behavior for now:
    // - If there is a text selection, prioritize text-formatting tools.
    // - Else, fall back to combined score.
    const hasSelection = context && !!context.hasSelection;

    return tools
      .map((tool) => {
        let baseScore = combinedScore(tool.id, usageStats);
        let boost = 0;

        if (hasSelection && tool.tags && tool.tags.includes('text-format')) {
          boost += 5; // big boost if it's relevant to selection
        }

        return {
          tool,
          score: baseScore + boost,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.tool);
  }

  /**
   * Main API:
   * Given tools + current mode + optional context, return tools sorted.
   *
   * @param {Object} options
   * @param {Array}  options.tools  - list of tool definitions
   * @param {string} options.mode   - 'frequency' | 'recency' | 'combined' | 'highlight'
   * @param {Object} options.context - selection/caret context (optional)
   */
  function getSortedTools({ tools, mode, context } = {}) {
    if (!Array.isArray(tools)) return [];

    const usageStats = (global.usageTracker && global.usageTracker.getUsageStats())
      ? global.usageTracker.getUsageStats()
      : {};

    const m = mode || MODES.COMBINED;

    if (m === MODES.FIXED) {
    return tools.slice(); // preserve original order, no usage-based sorting
  }

    // Highlight-only special handling
    if (m === MODES.HIGHLIGHT_ONLY) {
      return highlightOnlySort(tools, usageStats, context || {});
    }

    // Build generic scored list
    const scored = tools.map((tool) => {
      let score = 0;

      if (m === MODES.FREQUENCY) {
        score = frequencyScore(tool.id, usageStats);
      } else if (m === MODES.RECENCY) {
        score = recencyScore(tool.id, usageStats);
      } else {
        // default COMBINED
        score = combinedScore(tool.id, usageStats);
      }

      return { tool, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.map((entry) => entry.tool);
  }

  const api = {
    MODES,
    getSortedTools,
  };

  global.adaptiveToolbarEngine = api;
})(window);
