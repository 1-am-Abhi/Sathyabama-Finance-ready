const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

/**
 * Server-side proxy to the Anthropic Claude API. The API key stays on the
 * server (ANTHROPIC_API_KEY) and is never exposed to the browser. Replaces the
 * previous fake, client-side "AI" service (Math.random-based mock).
 *
 * Model is configurable via AI_MODEL; defaults to Claude Opus 4.8.
 * Requests run WITHOUT extended thinking and with a modest max_tokens so they
 * complete comfortably within the app's request timeout (~10s).
 */
const AI_MODEL = process.env.AI_MODEL || 'claude-opus-4-8';

let client = null;
const getClient = () => {
    if (!process.env.ANTHROPIC_API_KEY) return null;
    if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
    return client;
};

const isConfigured = () => !!process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT =
    'You are an expert research-administration assistant for a university Research Finance & Event Management System. ' +
    'You help faculty and finance officers with research proposals, funding analysis, and administrative insights. ' +
    'Be concise, practical, and accurate. Never invent specific figures, names, citations, or data that were not provided; ' +
    'when information is missing, say so plainly rather than fabricating it. Prefer short markdown with clear headings and bullet points.';

const AI_UNAVAILABLE = () => {
    const e = new Error('AI assistance is not configured on the server.');
    e.code = 'AI_UNAVAILABLE';
    return e;
};

const runMessage = async ({ prompt, maxTokens = 700 }) => {
    const c = getClient();
    if (!c) throw AI_UNAVAILABLE();

    const resp = await c.messages.create({
        model: AI_MODEL,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
    });

    return (resp.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
};

// Split model output into bullet "points" for consumers that expect a list.
const extractPoints = (text) =>
    String(text || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => /^([-*•]|\d+[.)])\s+/.test(l))
        .map((l) => l.replace(/^([-*•]|\d+[.)])\s+/, '').trim())
        .filter(Boolean)
        .slice(0, 10);

const clampContext = (context) => {
    if (context == null) return '';
    let s;
    try { s = typeof context === 'string' ? context : JSON.stringify(context); }
    catch { s = String(context); }
    return s.length > 6000 ? `${s.slice(0, 6000)}… (truncated)` : s;
};

const TASK_INSTRUCTIONS = {
    projectSummary: 'Write a 2-3 sentence executive summary of this research project.',
    projectRisk: 'Assess the financial and delivery risk of this research project. List the top 3-5 risks as bullets, each with a one-line mitigation.',
    duplicateProposal: 'Given this project, note whether its scope looks generic or potentially overlapping with common research themes, and suggest how to make it more distinctive. Be brief.',
    fundingSuccess: 'Estimate qualitatively how fundable this project looks and why. Give 3-4 concrete bullets on strengths and gaps. Do NOT invent a numeric score.',
    researchInsights: 'From this data, surface 3-5 concise, actionable insights for a faculty researcher.',
    personalMetrics: 'Summarize this faculty member\'s research/finance activity in 3-4 encouraging but honest bullets.',
    institutionalFinance: 'Provide 3-5 bullet insights a finance officer should note from this institutional finance data.',
    summarizeRequest: 'Summarize this fund/request record in 2-3 sentences for an approver.',
    eventFeasibility: 'Assess the feasibility of this event in 3-4 bullets (budget realism, logistics, value).',
    researchTrends: 'From this data, list 3-4 emerging themes or trends as bullets.',
    chat: 'Answer the user question helpfully and concisely based on the provided context.',
    researchImpact: 'Describe the likely research impact of this project in 3-4 bullets.',
    collaborators: 'Suggest 3-4 types of collaborators or departments that would strengthen this work. Do NOT invent real people\'s names.',
};

const generateProposal = async ({ topic }) => {
    const t = String(topic || '').trim();
    if (!t) { const e = new Error('A proposal topic is required'); e.code = 'BAD_INPUT'; throw e; }

    const prompt =
        `Draft a concise research project proposal outline for the topic: "${t}".\n` +
        'Use markdown headings for: Title, Abstract (3-4 sentences), Objectives (3-5 bullets), ' +
        'Methodology (a short paragraph), Expected Outcomes (bullets), and an Indicative Budget Breakdown ' +
        '(a short list of categories with rough proportion percentages — NOT absolute currency amounts). ' +
        'Keep the whole thing under ~400 words.';

    const text = await runMessage({ prompt, maxTokens: 1500 });
    return { text };
};

const analyze = async ({ task, context }) => {
    const key = String(task || 'chat');
    const instruction = TASK_INSTRUCTIONS[key] || TASK_INSTRUCTIONS.chat;
    const ctx = clampContext(context);

    const prompt =
        `${instruction}\n\n` +
        (ctx ? `Relevant data (JSON or text):\n${ctx}\n\n` : '') +
        'Respond in short markdown. If the data is insufficient, say so briefly rather than guessing.';

    const text = await runMessage({ prompt, maxTokens: 700 });
    return { text, points: extractPoints(text) };
};

module.exports = { isConfigured, generateProposal, analyze, AI_MODEL };
