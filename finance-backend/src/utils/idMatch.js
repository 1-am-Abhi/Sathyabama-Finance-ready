const { Op } = require('sequelize');

/**
 * Match a row by EITHER its model PK `id` OR the legacy `_id` DB column.
 *
 * Several tables (Project, FundRequest, Disbursement, ...) have both an `id`
 * primary key AND an `_id` UUID column. The models declare only `id` and never
 * populate `_id`, so for rows created after the UUID-hardening migration the DB
 * default gives `_id` a DIFFERENT value than `id` (they only match for older
 * rows). The API exposes `id`, and FKs store `id` (via getRecordId), but a lot
 * of lookups were written as `where: { _id: <the id value> }`, which fails for
 * the diverged rows — producing "not found" errors on newer records.
 *
 * Using this matcher makes lookups correct regardless of divergence:
 *   Model.findOne({ where: { ...idMatch(id), organizationId } })
 */
const idMatch = (id) => ({ [Op.or]: [{ id }, { _id: id }] });

module.exports = { idMatch };
