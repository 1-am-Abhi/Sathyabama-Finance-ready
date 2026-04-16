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

const logger = require('./logger');

const serverError = (res, error, context = 'CONTROLLER') => {
  logger.error(`[${context}] Error occurred`, {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
  
  const payload = {
      success: false, 
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
  };

  if (process.env.NODE_ENV === 'development' && error.stack) {
      payload.stack = error.stack;
  }

  return res.status(500).json(payload);
};

module.exports = { serverError };
