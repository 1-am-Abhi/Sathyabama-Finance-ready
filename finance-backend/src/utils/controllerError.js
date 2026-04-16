/**
 * Shared controller error helper.
 *
 * In development: surfaces the real error.message to help debug.
 * In production:  returns a generic message so DB/ORM internals are never exposed.
 *
 * Usage in any controller:
 *   const { serverError } = require('../utils/controllerError');
 *   ...
 *   } catch (error) {
 *     return serverError(res, error);
 *   }
 */

const serverError = (res, error, context = 'CONTROLLER') => {
  console.error(`[${context}]`, error);
  const message =
    process.env.NODE_ENV === 'development'
      ? error.message
      : 'Internal server error';
  return res.status(500).json({ success: false, message });
};

module.exports = { serverError };
