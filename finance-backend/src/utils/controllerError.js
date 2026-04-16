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
  console.error(`🔥 [${context}] FULL ERROR OBJECT:`, error);
  console.error(`🔥 [${context}] STACK TRACE:`, error.stack);
  
  const payload = {
      success: false, 
      message: error.message || 'Internal server error',
      stack: error.stack
  };

  return res.status(500).json(payload);
};

module.exports = { serverError };
