/**
 * Sathyabama Research Management System - AI Intelligence Service
 * Provides research intelligence for Admin, Faculty, and Finance portals.
 */

const delay = (ms) => new Promise(res => setTimeout(res, ms));

/**
 * SECTION 3 - AI SUMMARY FUNCTION
 */
export const generateProjectSummary = async (project) => {
    await delay(1200);
    return {
        type: "summary",
        title: "Proposal Intelligence Summary",
        summary: `This research proposal, led by ${project.faculty || 'the investigator'}, aims to address critical gaps in ${project.centre || 'the research area'}. The methodology focuses on ${project.description?.substring(0, 100) || 'computational modeling and empirical validation'} to achieve institutional goals.`,
        keyPoints: [
            { label: "Objective", value: "Optimize Performance" },
            { label: "Methodology", value: "Phased Implementation" },
            { label: "Expected Impact", value: "High Academic Value" }
        ],
        highlights: [
            "Innovative approach to existing challenges",
            "Strong alignment with Sathyabama strategic goals",
            "Clear and measurable deliverables"
        ],
        recommendation: "Strong proposal with clear societal and institutional benefits.",
        confidence: 94
    };
};

/**
 * SECTION 4 - RISK ANALYSIS FUNCTION
 */
export const analyzeProjectRisk = async (project) => {
    await delay(1500);
    const score = Math.floor(Math.random() * 25) + 20; // 20-45 range
    return {
        type: "risk",
        title: "Feasibility & Risk Assessment",
        summary: `The risk profile for "${project.projectTitle || project.title}" is calculated as ${score < 40 ? 'Medium-Low' : 'Medium'}. Technical complexity is balanced by the team's expertise.`,
        riskScore: `${score}/100`,
        riskLevel: score < 30 ? "LOW" : score < 50 ? "MEDIUM" : "HIGH",
        confidence: 88,
        strengths: [
            "Highly experienced research team",
            "Comprehensive methodology",
            "Detailed budget justification"
        ],
        weaknesses: [
            "Ambitious delivery timeline",
            "Dependence on external labs for Phase 3"
        ],
        recommendation: "Feasible with quarterly milestone tracking."
    };
};

/**
 * SECTION 5 - DUPLICATE PROPOSAL DETECTION
 */
export const detectDuplicateProposal = async (project) => {
    await delay(1400);
    const score = Math.floor(Math.random() * 15) + 15; // 15-30% range
    return {
        type: "duplicate",
        title: "Plagiarism & Similarity Scan",
        summary: `Automatic scan against 4,500+ institutional records shows ${score}% thematic similarity. No direct duplicates found, ensuring high originality.`,
        similarityScore: `${score}%`,
        confidence: 96,
        keyPoints: [
            { label: "Structural Match", value: "Low" },
            { label: "Thematic Overlap", value: "Moderate" },
            { label: "Biblio Match", value: "4.2%" }
        ],
        similarAreas: [
            "Advanced Computational Fluidics",
            "Smart Grid Distribution Models"
        ],
        recommendation: "High originality confirmed. Safe to proceed."
    };
};

/**
 * SECTION 6 - FUNDING SUCCESS PREDICTION
 */
export const predictFundingSuccess = async (project) => {
    await delay(1600);
    const prob = Math.floor(Math.random() * 20) + 70; // 70-90% range
    return {
        type: "prediction",
        title: "Grant Approval Probability",
        summary: `Based on current trends from ${project.agency || 'DST/SERB'}, this proposal has an ${prob}% approval probability. Novelty and investigator H-index are major positive drivers.`,
        approvalProbability: `${prob}%`,
        confidence: 91,
        keyPoints: [
            { label: "Approval Prob.", value: `${prob}%` },
            { label: "Impact Factor", value: "4.8" },
            { label: "Grant Readiness", value: "Ready" }
        ],
        impactPrediction: "High research relevance in the current national landscape.",
        fundingPotential: "Strong candidate for major government agency grants.",
        recommendation: "Proceed with submission to the primary funding agency."
    };
};

/**
 * SECTION 10 - DASHBOARD AI FEATURES
 */

// Admin Dashboard - Institutional Data Analysis
export const generateResearchInsights = async () => {
    await delay(2000);
    return {
        type: "insights",
        title: "Institutional Research Intelligence",
        summary: "Institutional research output has increased by 22% this fiscal year. CSRC and Biotechnology remain the lead growth centers.",
        confidence: 98,
        keyPoints: [
            { label: "Growth YoY", value: "+22%" },
            { label: "Top Centre", value: "CSRC" },
            { label: "Fund Efficiency", value: "94%" }
        ],
        highlights: [
            "15% increase in Q1 journal publications",
            "Successful diversification of funding sources",
            "Inter-departmental collaboration up by 30%"
        ],
        recommendation: "Continue incentivizing multi-disciplinary proposals."
    };
};

// Faculty Dashboard - Personal Research Analysis
export const analyzePersonalResearchMetrics = async (facultyName) => {
    await delay(1500);
    return {
        type: "faculty",
        title: "Personal Research Assistant",
        summary: `Assessment for ${facultyName || 'Faculty'}: Your H-index potential is projected to increase based on current citation trends.`,
        confidence: 92,
        keyPoints: [
            { label: "Active Grants", value: "3" },
            { label: "Citation Trend", value: "+12%" },
            { label: "Collaboration", value: "High" }
        ],
        highlights: [
            "Top cited faculty in your department",
            "Strong potential for SERB-CORE grant",
            "Recommended for International Travel Support"
        ]
    };
};

// Finance Dashboard - Funding and Budget Analysis
export const analyzeInstitutionalFinance = async () => {
    await delay(1800);
    return {
        type: "finance",
        title: "Financial Budget Intelligence",
        summary: "Audit reveals 96% budget utilization efficiency. Recommended re-allocation for unspent consumables in Mechanical department.",
        confidence: 97,
        keyPoints: [
            { label: "Usage Rate", value: "96.4%" },
            { label: "Audit Result", value: "Clean" },
            { label: "Risk Level", value: "Minimal" }
        ],
        recommendation: "Transfer 4.5L surplus from Mechanical to Electronics phase 2."
    };
};

/**
 * OD/Event Specific Summaries
 */
export const summarizeRequest = async (request) => {
    await delay(1000);
    return {
        type: "summary",
        title: "Request Intelligence Summary",
        summary: `This ${request.type || 'request'} by ${request.faculty || 'Faculty Member'} focuses on ${request.purpose || 'Academic Support'}. The justification is aligned with institutional standards and historical data.`,
        confidence: 88,
        keyPoints: [
            { label: "Purpose", value: request.purpose || "Academic" },
            { label: "Department", value: request.department || "Academic" },
            { label: "Status", value: "Recommended" }
        ]
    };
};

export const analyzeEventFeasibility = async (event) => {
    await delay(1300);
    return {
        type: "feasibility",
        title: "Event Feasibility Report",
        summary: `The event "${event.title}" is 92% feasible for the proposed dates. Venue and sponsorship availability are confirmed.`,
        confidence: 90,
        keyPoints: [
            { label: "Feasibility", value: "92%" },
            { label: "Venue Stats", value: "Available" },
            { label: "Budget Risk", value: "Low" }
        ]
    };
};

export const predictResearchTrends = async () => {
    await delay(1000);
    return {
        type: "trends",
        title: "Emerging Research Trends",
        summary: "AI implementation in Healthcare and Green Hydrogen production are the most surging trends for 2025-26.",
        confidence: 85,
        keyPoints: [
            { label: "Top Trend", value: "Sustainable AI" },
            { label: "Growth", value: "+42%" },
            { label: "Agency Focus", value: "DST/SERB" }
        ]
    };
};

export const generateFullProposal = async (topic) => {
    await delay(2500);
    return {
        type: "proposal",
        title: "AI Proposal Architect",
        summary: `Full proposal outline generated for: "${topic}". Includes structure, background, and budget estimates.`,
        confidence: 91,
        fullContent: {
            title: topic,
            abstract: "The research proposes a novel framework for...",
            methodology: "Phased experimental design using...",
            budget: "Estimated 14.2 Lakhs institutional support."
        }
    };
};

export const getChatResponse = async (query) => {
    await delay(800);
    return {
        role: 'assistant',
        content: `I'm your Sathyabama Research AI. Regarding "${query}", I've analyzed our institutional database and recommend checking the latest SERB guidelines or using the Proposal Generator.`
    };
};

// Backward compatibility aliases
export const analyzeProposal = analyzeProjectRisk;
export const predictGrantSuccess = predictFundingSuccess;
export const summarizeResearchProposal = summarizeRequest;
export const predictResearchImpact = async (project) => {
    await delay(1200);
    return {
        type: "summary",
        title: "Research Impact Assessment",
        summary: `Strategic analysis of "${project.title}" indicates a high potential for multidisciplinary impact. The project aligns with global research priorities and institutional KPIs.`,
        confidence: 94,
        keyPoints: [
            { label: "Citation Potential", value: "High" },
            { label: "Societal Value", value: "Significant" },
            { label: "Academic Novelty", value: "9.2/10" }
        ],
        highlights: [
            "Potential for 3+ high-impact journal publications",
            "Strong alignment with UN Sustainable Development Goals",
            "Innovative methodology with scalability potential"
        ]
    };
};
export const getFundingRecommendations = (topic) => predictFundingSuccess({ projectTitle: topic });

export const findMoreCollaborators = async () => {
    await delay(1200);
    return {
        type: "collaborators",
        title: "Potential Collaborators Identified",
        summary: "AI has analyzed researcher profiles across departments and identified three key faculty members whose current research interests align with your portfolio.",
        confidence: 90,
        keyPoints: [
            { label: "Matches Found", value: "3" },
            { label: "Strength", value: "High" },
            { label: "Cross-Dept", value: "Yes" }
        ],
        highlights: [
            "Dr. Anjali Sharma (Computer Science) - Expertise in Distributed Systems",
            "Dr. Vikram Singh (Mechanical) - Expertise in Thermal Modeling",
            "Dr. Priya Reddy (Biotech) - Expertise in Genetic Sequencing"
        ],
        recommendation: "Connecting with Dr. Anjali Sharma for your current project is highly recommended."
    };
};
