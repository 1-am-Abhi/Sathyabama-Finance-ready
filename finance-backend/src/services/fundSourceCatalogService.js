const { Op } = require('sequelize');
const models = require('../models');

const { FundRequest, FundSource, Project } = models;

const FUND_SOURCE_VALUES = ['INSTITUTIONAL', 'PFMS', 'OTHERS'];

const FUND_SOURCE_KEYS = {
    INSTITUTIONAL: 'institutionalFunds',
    PFMS: 'pfmsFunds',
    OTHERS: 'othersFunds',
};

const LEGACY_SOURCE_ALIASES = {
    COLLEGE: 'INSTITUTIONAL',
    COLLEGE_FUNDED: 'INSTITUTIONAL',
    INSTITUTIONAL: 'INSTITUTIONAL',
    PFMS: 'PFMS',
    DIRECTOR: 'INSTITUTIONAL',
    DIRECTOR_INNOVATION: 'INSTITUTIONAL',
    DIRECTOR_INNOVATION_FUND: 'INSTITUTIONAL',
    OTHER: 'OTHERS',
    OTHERS: 'OTHERS',
};

const LEGACY_SOURCE_TYPE_ALIASES = {
    institutionalFunds: 'institutionalFunds',
    collegeFunds: 'institutionalFunds',
    pfmsFunds: 'pfmsFunds',
    othersFunds: 'othersFunds',
    directorFunds: 'institutionalFunds',
};

const LEGACY_DB_SOURCE_VALUES = ['DIRECTOR', 'COLLEGE'];

const normalizeFundSource = (value) => {
    const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
    return LEGACY_SOURCE_ALIASES[raw] || 'INSTITUTIONAL';
};

const normalizeFundSourceType = (value) =>
    LEGACY_SOURCE_TYPE_ALIASES[String(value || '').trim()] || null;

const mapToFundSourceKey = (value) =>
    FUND_SOURCE_KEYS[normalizeFundSource(value)] || FUND_SOURCE_KEYS.INSTITUTIONAL;

let ensureCanonicalFundSourcesPromise = null;

const ensureCanonicalFundSources = async () => {
    if (ensureCanonicalFundSourcesPromise) {
        return ensureCanonicalFundSourcesPromise;
    }

    ensureCanonicalFundSourcesPromise = (async () => {
        // SAFE MIGRATION: Use raw SQL to rename legacy enum values to the canonical INSTITUTIONAL 
        // to avoid database crash on dashboard lead.
        for (const legacyValue of LEGACY_DB_SOURCE_VALUES) {
            try {
                await Promise.all([
                    sequelize.query(
                        'UPDATE "Projects" SET "fundingSource" = :target WHERE "fundingSource"::text = :legacy',
                        { replacements: { target: 'INSTITUTIONAL', legacy: legacyValue } }
                    ),
                    sequelize.query(
                        'UPDATE "FundRequests" SET "source" = :target WHERE "source"::text = :legacy',
                        { replacements: { target: 'INSTITUTIONAL', legacy: legacyValue } }
                    )
                ]);
            } catch (e) {
                // Silently skip if the enum doesn't exist yet or update fails
            }
        }

        const rows = await FundSource.findAll({
            order: [['updatedAt', 'DESC']],
        });

        const latestByCanonicalType = new Map();

        rows.forEach((row) => {
            const canonicalType = normalizeFundSourceType(row.sourceType);
            if (!canonicalType) {
                return;
            }

            const existing = latestByCanonicalType.get(canonicalType);
            const currentUpdatedAt = new Date(row.updatedAt || 0).getTime();
            const existingUpdatedAt = existing ? new Date(existing.updatedAt || 0).getTime() : -1;

            if (!existing || currentUpdatedAt >= existingUpdatedAt) {
                latestByCanonicalType.set(canonicalType, row);
            }
        });

        for (const [sourceType, row] of latestByCanonicalType.entries()) {
            const totalAllocated = Number(row.totalAllocated);
            const safeAmount = Number.isFinite(totalAllocated) ? totalAllocated : 0;
            
            const [canonicalRow] = await FundSource.findOrCreate({
                where: { sourceType },
                defaults: { totalAllocated: safeAmount },
            });

            // If the row exists but has 0, and the legacy row had a positive value, RESTORE IT.
            if (safeAmount > 0 && Number(canonicalRow.totalAllocated) === 0) {
                await canonicalRow.update({ totalAllocated: safeAmount });
            }
        }

        // REMOVED: Emergency recovery with hardcoded defaults is intentionally deleted.
        // FundSource values should only reflect what finance officers explicitly configure.

        await Promise.all(
            Object.values(FUND_SOURCE_KEYS).map((sourceType) =>
                FundSource.findOrCreate({
                    where: { sourceType },
                    defaults: { totalAllocated: 0 },
                })
            )
        );

        const legacySourceTypes = Object.keys(LEGACY_SOURCE_TYPE_ALIASES).filter(
            (sourceType) => normalizeFundSourceType(sourceType) !== sourceType
        );

        // DISABLED: Avoid destructive cleanup that might cause data loss
        /*
        if (legacySourceTypes.length) {
            await FundSource.destroy({
                where: {
                    sourceType: {
                        [Op.in]: legacySourceTypes,
                    },
                },
            });
        }
        */
    })();

    try {
        return await ensureCanonicalFundSourcesPromise;
    } catch (error) {
        ensureCanonicalFundSourcesPromise = null;
        throw error;
    }
};

module.exports = {
    FUND_SOURCE_VALUES,
    FUND_SOURCE_KEYS,
    ensureCanonicalFundSources,
    mapToFundSourceKey,
    normalizeFundSource,
    normalizeFundSourceType,
};
