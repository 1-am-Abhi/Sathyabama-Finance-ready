export const FUND_STAGES = {
    FUND_APPROVED: 'FUND_APPROVED',
    FUND_RELEASED: 'FUND_RELEASED',
    CHEQUE_RELEASED: 'CHEQUE_RELEASED',
    AMOUNT_DISBURSED: 'AMOUNT_DISBURSED',
    UTILIZATION_COMPLETED: 'UTILIZATION_COMPLETED',
    SETTLEMENT_CLOSED: 'SETTLEMENT_CLOSED'
};

export const FUND_STAGE_LABELS = {
    [FUND_STAGES.FUND_APPROVED]: 'Fund Approved',
    [FUND_STAGES.FUND_RELEASED]: 'Fund Released',
    [FUND_STAGES.CHEQUE_RELEASED]: 'Cheque Released',
    [FUND_STAGES.AMOUNT_DISBURSED]: 'Amount Disbursed',
    [FUND_STAGES.UTILIZATION_COMPLETED]: 'Utilization Completed',
    [FUND_STAGES.SETTLEMENT_CLOSED]: 'Settlement Closed'
};

export const FUND_STAGE_ORDER = [
    FUND_STAGES.FUND_APPROVED,
    FUND_STAGES.FUND_RELEASED,
    FUND_STAGES.CHEQUE_RELEASED,
    FUND_STAGES.AMOUNT_DISBURSED,
    FUND_STAGES.UTILIZATION_COMPLETED,
    FUND_STAGES.SETTLEMENT_CLOSED
];

export const FUND_STAGE_DESCRIPTIONS = {
    [FUND_STAGES.FUND_APPROVED]: 'Project fund request has been approved by Admin',
    [FUND_STAGES.FUND_RELEASED]: 'Funds have been released from university account',
    [FUND_STAGES.CHEQUE_RELEASED]: 'Cheque has been issued to the project',
    [FUND_STAGES.AMOUNT_DISBURSED]: 'Amount has been disbursed to faculty/project account',
    [FUND_STAGES.UTILIZATION_COMPLETED]: 'Utilization certificate and documents submitted',
    [FUND_STAGES.SETTLEMENT_CLOSED]: 'Final settlement completed and closed'
};

export function getNextStage(currentStage) {
    const currentIndex = FUND_STAGE_ORDER.indexOf(currentStage);
    if (currentIndex === -1 || currentIndex === FUND_STAGE_ORDER.length - 1) {
        return null;
    }
    return FUND_STAGE_ORDER[currentIndex + 1];
}

export function canTransitionTo(currentStage, targetStage) {
    const nextStage = getNextStage(currentStage);
    return nextStage === targetStage;
}

export function getStageIndex(stage) {
    return FUND_STAGE_ORDER.indexOf(stage);
}

export function isStageCompleted(stage, currentStage) {
    return getStageIndex(stage) < getStageIndex(currentStage);
}

export function isCurrentStage(stage, currentStage) {
    return stage === currentStage;
}
