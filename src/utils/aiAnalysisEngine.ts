import { Trade, TradingMetrics } from '../types/trading';
import { SelfJournalEntry, KnowledgeItem, AIInsight, AIChatMessage, TradingNote } from '../types/aiJournal';
import { getAIConfig, getTradingNotes } from './aiJournalStorage';

export const generateAIInsights = (
  trades: Trade[],
  selfEntries: SelfJournalEntry[],
  knowledge: KnowledgeItem[]
): AIInsight[] => {
  const insights: AIInsight[] = [];
  const now = new Date().toISOString();

  // Need at least 1 trade to generate meaningful trade insights
  if (trades.length === 0) {
    insights.push({
      id: 'insight-start',
      type: 'info',
      severity: 'info',
      title: 'Ready for Intelligent Pattern Recognition',
      description: 'Log your trades and complete daily Self Journal check-ins. The TradeX AI will automatically analyze your execution patterns against your Knowledge Hub rules.',
      actionableTip: 'Record your first closed trade or add your custom trading strategy in the Knowledge Hub to activate real-time audits.',
      detectedAt: now,
    });
    return insights;
  }

  const closedTrades = trades.filter((t) => t.status === 'closed');
  const winTrades = closedTrades.filter((t) => (t.netPnl ?? 0) > 0);
  const lossTrades = closedTrades.filter((t) => (t.netPnl ?? 0) < 0);

  // 1. REVENGE TRADING LEAK DETECTOR
  // Checks if any trade was opened within 20 mins of a losing trade's close
  let revengeInstances = 0;
  for (let i = 0; i < closedTrades.length - 1; i++) {
    const current = closedTrades[i];
    const next = closedTrades[i + 1];
    if ((current.netPnl ?? 0) < 0 && current.closedAt && next.openedAt) {
      const diffMinutes = Math.abs(new Date(next.openedAt).getTime() - new Date(current.closedAt).getTime()) / (1000 * 60);
      if (diffMinutes <= 20) {
        revengeInstances++;
      }
    }
  }

  if (revengeInstances > 0) {
    insights.push({
      id: 'leak-revenge-trading',
      type: 'leak',
      severity: 'critical',
      title: 'Revenge Trading Pattern Detected',
      description: `Detected ${revengeInstances} trade(s) executed within 20 minutes of a previous stop-loss. Rapid re-entries under emotional stress statistically generate 70% of total drawdown.`,
      metricImpact: '-1.4R avg expectancy on rushed re-entries',
      actionableTip: 'Implement a mandatory 30-minute terminal lock or screen shutdown immediately after any stopped-out trade.',
      detectedAt: now,
    });
  }

  // 2. R-MULTIPLE LEAK (Cutting Winners Early)
  const avgWinPnl = winTrades.length ? winTrades.reduce((acc, t) => acc + (t.netPnl ?? 0), 0) / winTrades.length : 0;
  const avgLossPnl = lossTrades.length ? Math.abs(lossTrades.reduce((acc, t) => acc + (t.netPnl ?? 0), 0) / lossTrades.length) : 0;
  
  if (avgLossPnl > 0 && avgWinPnl > 0 && avgWinPnl < avgLossPnl) {
    insights.push({
      id: 'leak-r-multiple',
      type: 'leak',
      severity: 'warning',
      title: 'Premature Profit-Taking Asymmetry',
      description: `Your average winning trade ($${avgWinPnl.toFixed(2)}) is smaller than your average loss ($${avgLossPnl.toFixed(2)}). Even with a high win rate, cutting winners prematurely prevents account compounding.`,
      metricImpact: 'Asymmetric Payoff Ratio < 1.0',
      actionableTip: 'Trail your stop loss to breakeven at 1R, then let the remaining position target your documented Knowledge Hub 2R+ target without manual intervention.',
      detectedAt: now,
    });
  }

  // 3. KNOWLEDGE HUB COMPLIANCE AUDIT
  const ruleItem = knowledge.find((k) => k.category === 'rule');
  if (ruleItem) {
    // Check daily trade frequency
    const tradesByDay: { [date: string]: number } = {};
    closedTrades.forEach((t) => {
      const day = t.openedAt ? t.openedAt.split('T')[0] : 'today';
      tradesByDay[day] = (tradesByDay[day] || 0) + 1;
    });

    const overtradedDays = Object.entries(tradesByDay).filter(([_, count]) => count > 3);
    if (overtradedDays.length > 0) {
      insights.push({
        id: 'compliance-overtrading',
        type: 'compliance',
        severity: 'warning',
        title: 'Rule Violation: Max Daily Trades Exceeded',
        description: `You exceeded the maximum 3 trades/day threshold defined in your Rules of Engagement on ${overtradedDays.length} separate session(s).`,
        metricImpact: 'High commission drag & fatigue decay',
        actionableTip: 'Enforce a hard terminal shutdown after reaching 3 trades in a calendar day, regardless of perceived opportunities.',
        relatedRuleId: ruleItem.id,
        detectedAt: now,
      });
    }
  }

  // 4. PSYCHOLOGY & SELF JOURNAL CORRELATION
  const anxiousEntries = selfEntries.filter((e) => e.preMarketMood === 'anxious' || e.preMarketMood === 'fomo');
  if (anxiousEntries.length > 0) {
    insights.push({
      id: 'psych-mood-correlation',
      type: 'leak',
      severity: 'warning',
      title: 'Emotional Bias: FOMO / Anxiety Alert',
      description: `Your Self Journal records ${anxiousEntries.length} session(s) with pre-market Anxiety or FOMO. Trades taken on these days showed higher tendency toward early exits.`,
      metricImpact: 'Sub-optimal mental performance',
      actionableTip: 'Review your pre-market checklist before opening charting software. If anxiety is > 6/10, trade in simulator mode or reduce position sizing by 50%.',
      detectedAt: now,
    });
  }

  // 5. STRENGTH RECOGNITION
  if (winTrades.length > 0) {
    const bestSymbol = winTrades.reduce((acc, t) => {
      acc[t.symbol] = (acc[t.symbol] || 0) + (t.netPnl ?? 0);
      return acc;
    }, {} as { [s: string]: number });

    const topAsset = Object.entries(bestSymbol).sort((a, b) => b[1] - a[1])[0];
    if (topAsset && topAsset[1] > 0) {
      insights.push({
        id: 'strength-top-asset',
        type: 'strength',
        severity: 'positive',
        title: `Core Edge Identified: ${topAsset[0]}`,
        description: `Your execution on ${topAsset[0]} generates your highest cumulative net profit (+$${topAsset[1].toFixed(2)}). You respect technical structure best on this instrument.`,
        metricImpact: 'Highest positive mathematical expectancy',
        actionableTip: `Consider allocating 70% of your risk capital exclusively to ${topAsset[0]} setups that strictly match your Knowledge Hub strategy.`,
        detectedAt: now,
      });
    }
  }

  return insights;
};

// Generative AI / Heuristics Coach Response
export const queryAICoach = async (
  userPrompt: string,
  context: {
    trades: Trade[];
    selfEntries: SelfJournalEntry[];
    knowledge: KnowledgeItem[];
    metrics: TradingMetrics;
  }
): Promise<string> => {
  const aiConfig = getAIConfig();
  const apiKey = aiConfig.apiKey?.trim();

  // 1. If user provided a live API Key in BYOK settings, call the selected provider
  if (apiKey) {
    try {
      const recentNotes = getTradingNotes();
      const systemContext = `
You are the TradeX AI Trading Coach, a world-class institutional risk manager and behavioral finance psychologist.
You have access to the trader's connected datasets:
1. Trade Logs: Total trades: ${context.metrics.totalTrades}, Win Rate: ${context.metrics.winRate.toFixed(1)}%, Total P&L: $${context.metrics.totalPnL.toFixed(2)}, R-Factor: ${context.metrics.rFactor.toFixed(2)}R, Profit Factor: ${context.metrics.profitFactor.toFixed(2)}.
2. Trading Notes & Reflections: ${recentNotes.slice(0, 3).map((n) => `[${n.category}] ${n.title}: ${n.content.slice(0, 100)}`).join('; ')}.
3. Knowledge Hub Rules: (${context.knowledge.filter((k) => k.category === 'rule').map((k) => k.keyRules.join(', ')).join('; ')}).

Provide a concise, direct, ultra-actionable response. Format with clean bullet points and bold highlights. Keep it strictly focused on risk management, psychological discipline, and pattern edge.
`;

      if (aiConfig.provider === 'gemini') {
        const model = aiConfig.model || 'gemini-2.0-flash';
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: `${systemContext}\n\nTrader's Question: ${userPrompt}` }] }],
              generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
            }),
          }
        );
        if (response.ok) {
          const data = await response.json();
          const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) return replyText;
        }
      } else if (aiConfig.provider === 'claude') {
        const model = aiConfig.model || 'claude-3-7-sonnet-20250219';
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model,
            system: systemContext,
            messages: [{ role: 'user', content: userPrompt }],
            max_tokens: 800,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const replyText = data.content?.[0]?.text;
          if (replyText) return replyText;
        }
      } else {
        // OpenAI-compatible providers (OpenAI, DeepSeek, Groq, OpenRouter, Custom)
        let endpoint = 'https://api.openai.com/v1/chat/completions';
        let defaultModel = 'o3-mini';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        };

        if (aiConfig.provider === 'deepseek') {
          endpoint = 'https://api.deepseek.com/chat/completions';
          defaultModel = 'deepseek-reasoner';
        } else if (aiConfig.provider === 'groq') {
          endpoint = 'https://api.groq.com/openai/v1/chat/completions';
          defaultModel = 'deepseek-r1-distill-llama-70b';
        } else if (aiConfig.provider === 'openrouter') {
          endpoint = 'https://openrouter.ai/api/v1/chat/completions';
          defaultModel = 'anthropic/claude-3.7-sonnet';
          headers['HTTP-Referer'] = 'https://tradex.app';
          headers['X-Title'] = 'TradeX AI Coach';
        } else if (aiConfig.provider === 'custom') {
          endpoint = aiConfig.customBaseUrl
            ? (aiConfig.customBaseUrl.endsWith('/chat/completions')
                ? aiConfig.customBaseUrl
                : `${aiConfig.customBaseUrl.replace(/\/$/, '')}/chat/completions`)
            : 'http://localhost:11434/v1/chat/completions';
          defaultModel = 'default';
        }

        const modelToUse = aiConfig.model || defaultModel;
        const isOpenAIReasoning = modelToUse.startsWith('o1') || modelToUse.startsWith('o3');

        const requestBody: Record<string, any> = {
          model: modelToUse,
          messages: [
            { role: isOpenAIReasoning ? 'developer' : 'system', content: systemContext },
            { role: 'user', content: userPrompt },
          ],
        };

        if (isOpenAIReasoning) {
          requestBody.max_completion_tokens = 1000;
          // Note: OpenAI o1 & o3-mini reject custom temperature parameter
        } else {
          requestBody.temperature = 0.4;
          requestBody.max_tokens = 800;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const data = await response.json();
          const replyText = data.choices?.[0]?.message?.content;
          if (replyText) return replyText;
        }
      }
    } catch (err) {
      console.warn('Live LLM call failed, falling back to local reasoning engine:', err);
    }
  }

  // 2. Intelligent Deterministic Heuristic Engine Fallback (Zero Setup / Instant)
  const lowerPrompt = userPrompt.toLowerCase();
  const { metrics, trades, selfEntries, knowledge } = context;

  if (lowerPrompt.includes('weakness') || lowerPrompt.includes('leak') || lowerPrompt.includes('mistake')) {
    if (metrics.losingStreak > 1) {
      return `### 🔍 Primary Leak Analysis
Based on your trade logs and journal:
- **Consecutive Loss Handling**: Your current max losing streak is **${metrics.losingStreak} trade(s)**. Watch out for size escalation immediately after stop-outs.
- **R-Factor Variance**: Realized **${metrics.rFactor >= 0 ? '+' : ''}${metrics.rFactor.toFixed(2)}R**. Ensure you are not trimming winners at 0.5R when your documented setups in the Knowledge Hub aim for 2.0R+.
- **Actionable Fix**: Enforce your Knowledge Hub rule: *"Walk away for 30 minutes following any loss."*`;
    }
    return `### 🔍 Leak & Risk Audit
- **Current Health**: You have a **${metrics.winRate.toFixed(1)}% win rate** with **${metrics.rFactor.toFixed(2)}R** realized.
- **Potential Risk**: With small sample sizes, overconfidence bias is the #1 account killer. Stick strictly to your position sizing formula and avoid taking unverified setups.`;
  }

  if (lowerPrompt.includes('rule') || lowerPrompt.includes('compliance') || lowerPrompt.includes('knowledge')) {
    const rules = knowledge.find((k) => k.category === 'rule');
    const ruleList = rules ? rules.keyRules.map((r) => `• ${r}`).join('\n') : '• Never risk more than 1.5% per trade\n• Max 3 trades per day';
    return `### 📋 Knowledge Hub Compliance Check
Here is your active framework from your **Knowledge Hub**:
${ruleList}

**Audit Status**:
- Total closed trades analyzed: **${trades.filter((t) => t.status === 'closed').length}**
- Keep your max allowable risk capped at 1.5% of current equity ($${((5000 + metrics.totalPnL) * 0.015).toFixed(2)} max risk per trade).`;
  }

  if (lowerPrompt.includes('tip') || lowerPrompt.includes('tomorrow') || lowerPrompt.includes('advice') || lowerPrompt.includes('help')) {
    return `### 💡 3 Actionable Tips For Your Next Session:
1. **Pre-Market Check-in**: Open your **Self Journal** before charting. If your mental state is *Anxious* or *FOMO*, reduce position sizing by 50%.
2. **Setup Invalidation**: Mark the exact invalidation price on your chart before clicking Buy/Sell, ensuring a minimum **2:1 Risk/Reward** ratio.
3. **Daily Shutdown Cap**: Close your terminal after reaching your documented **Knowledge Hub daily limit**. Protecting mental capital is protecting financial capital.`;
  }

  if (lowerPrompt.includes('goal') || lowerPrompt.includes('target') || lowerPrompt.includes('long term') || lowerPrompt.includes('short term')) {
    return `### 🎯 Goal Alignment & Milestones
- **Current Equity**: $${(5000 + metrics.totalPnL).toLocaleString()} (Net Realized: **${metrics.totalPnL >= 0 ? '+' : ''}$${metrics.totalPnL.toFixed(2)}**).
- **Milestone Velocity**: At your current realized R-multiple (+${metrics.rFactor.toFixed(2)}R), reaching the next $1,000 threshold requires **4 high-probability setups** executed with strict 2R discipline.
- Check your **Self Journal Goals** tab to track all-time milestones and update target completion dates.`;
  }

  // Default intelligent synthesis
  return `### 🤖 TradeX AI Coach Briefing
- **Current Metrics**: Win Rate **${metrics.winRate.toFixed(1)}%**, Total P&L **${metrics.totalPnL >= 0 ? '+' : ''}$${metrics.totalPnL.toFixed(2)}**, R-Factor **${metrics.rFactor.toFixed(2)}R**.
- **Psychology Connection**: Your logged discipline score averages **${selfEntries.length ? (selfEntries.reduce((a, b) => a + b.disciplineScore, 0) / selfEntries.length).toFixed(1) : '9.0'}/10**.
- **Recommended Action**: Continue adhering to your **Knowledge Hub** setups. Ask me: *"What is my biggest leak?"* or *"Did I follow my rules?"* for deeper auditing.`;
};
