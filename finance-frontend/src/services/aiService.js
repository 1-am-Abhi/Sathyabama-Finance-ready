/**
 * Sathyabama Research Management System - AI Intelligence Service
 *
 * Thin client over the backend AI proxy. Every export calls the real API via the
 * shared axios client (`apiClient`) and adapts the response into the shape its
 * consumer (mostly <AIResultModal />) already expects.
 *
 * Backend contract:
 *   POST /ai/proposal  { topic }            -> { success, data: { text } }
 *   POST /ai/analyze   { task, context }    -> { success, data: { text, points: string[] } }
 *
 * The service never throws to the UI: on any failure (network error, or a
 * success:false / AI_UNAVAILABLE response) it returns a graceful placeholder so
 * components can render without crashing.
 */
import apiClient from '../api/client';

const AI_UNAVAILABLE_MESSAGE = 'AI assistance is not configured.';

/**
 * Graceful fallback object shaped for <AIResultModal />.
 */
const unavailableResult = (title) => ({
    type: 'summary',
    title: title || 'AI Assistant',
    summary: `${AI_UNAVAILABLE_MESSAGE} Please try again later or contact your administrator.`,
});

/**
 * Calls POST /ai/proposal and returns the generated markdown text.
 */
const requestProposal = async (topic) => {
    const res = await apiClient.post('/ai/proposal', { topic });
    const payload = res?.data?.data || {};
    return { text: payload.text || '' };
};

/**
 * Calls POST /ai/analyze for a given task and returns { text, points }.
 */
const requestAnalyze = async (task, context = {}) => {
    const res = await apiClient.post('/ai/analyze', { task, context });
    const payload = res?.data?.data || {};
    return {
        text: payload.text || '',
        points: Array.isArray(payload.points) ? payload.points : [],
    };
};

/**
 * Adapts an /ai/analyze response into the <AIResultModal /> result shape.
 * Numeric "confidence"/"score" fields are intentionally omitted — the AI does
 * not reliably produce them, and the modal guards for their absence.
 */
const toModalResult = (type, title, data) => {
    const points = Array.isArray(data.points) ? data.points.filter(Boolean) : [];
    return {
        type,
        title,
        summary: data.text || 'No analysis was returned for this request.',
        ...(points.length ? { highlights: points } : {}),
    };
};

/**
 * Runs an analyze task and adapts it, falling back gracefully on any error.
 */
const runAnalyze = async (type, title, task, context) => {
    try {
        const data = await requestAnalyze(task, context);
        return toModalResult(type, title, data);
    } catch (err) {
        return unavailableResult(title);
    }
};

/**
 * SECTION 3 - AI SUMMARY FUNCTION
 */
export const generateProjectSummary = (project) =>
    runAnalyze('summary', 'Proposal Intelligence Summary', 'projectSummary', project);

/**
 * SECTION 4 - RISK ANALYSIS FUNCTION
 */
export const analyzeProjectRisk = (project) =>
    runAnalyze('analysis', 'Feasibility & Risk Assessment', 'projectRisk', project);

/**
 * SECTION 5 - DUPLICATE PROPOSAL DETECTION
 */
export const detectDuplicateProposal = (project) =>
    runAnalyze('duplicate', 'Plagiarism & Similarity Scan', 'duplicateProposal', project);

/**
 * SECTION 6 - FUNDING SUCCESS PREDICTION
 */
export const predictFundingSuccess = (project) =>
    runAnalyze('summary', 'Grant Approval Assessment', 'fundingSuccess', project);

/**
 * SECTION 10 - DASHBOARD AI FEATURES
 */

// Admin Dashboard - Institutional Data Analysis
export const generateResearchInsights = () =>
    runAnalyze('insights', 'Institutional Research Intelligence', 'researchInsights', {});

// Faculty Dashboard - Personal Research Analysis
export const analyzePersonalResearchMetrics = (facultyName) =>
    runAnalyze('faculty', 'Personal Research Assistant', 'personalMetrics', { facultyName });

// Finance Dashboard - Funding and Budget Analysis
export const analyzeInstitutionalFinance = () =>
    runAnalyze('finance', 'Financial Budget Intelligence', 'institutionalFinance', {});

/**
 * OD/Event Specific Summaries
 */
export const summarizeRequest = (request) =>
    runAnalyze('summary', 'Request Intelligence Summary', 'summarizeRequest', request);

export const analyzeEventFeasibility = (event) =>
    runAnalyze('feasibility', 'Event Feasibility Report', 'eventFeasibility', event);

export const predictResearchTrends = () =>
    runAnalyze('trends', 'Emerging Research Trends', 'researchTrends', {});

/**
 * Full markdown research proposal.
 */
export const generateFullProposal = async (topic) => {
    try {
        const { text } = await requestProposal(topic);
        return {
            type: 'proposal',
            title: 'AI Proposal Architect',
            summary: text || 'No proposal was generated for this topic.',
        };
    } catch (err) {
        return unavailableResult('AI Proposal Architect');
    }
};

/**
 * Conversational assistant response. Returns a chat message shape.
 */
export const getChatResponse = async (query) => {
    try {
        const data = await requestAnalyze('chat', { query });
        return {
            role: 'assistant',
            content: data.text || AI_UNAVAILABLE_MESSAGE,
        };
    } catch (err) {
        return {
            role: 'assistant',
            content: AI_UNAVAILABLE_MESSAGE,
        };
    }
};

// Backward compatibility aliases
export const analyzeProposal = analyzeProjectRisk;
export const predictGrantSuccess = predictFundingSuccess;
export const summarizeResearchProposal = summarizeRequest;

export const predictResearchImpact = (project) =>
    runAnalyze('summary', 'Research Impact Assessment', 'researchImpact', project);

export const getFundingRecommendations = (topic) =>
    runAnalyze('summary', 'Grant Approval Assessment', 'fundingSuccess', { topic });

export const findMoreCollaborators = () =>
    runAnalyze('collaborators', 'Potential Collaborators Identified', 'collaborators', {});
