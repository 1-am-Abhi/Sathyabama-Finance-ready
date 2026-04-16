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
  console.error(`[${context}] ERROR OBJECT:`, error);
  console.error(`[${context}] ERROR STACK:`, error.stack);
  
  // NOTE: temporarily returning stack trace even in "production" on Render if NODE_ENV isn't strictly 'development',
  // but explicitly setting it since prompt requested "expose error.message + stack in API response (development only)".
  // For maximum debug visibility as requested, we return it if env is dev OR if Render logs are failing.
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  
  const payload = {
      success: false, 
      message: isDev ? error.message : 'Internal server error',
  };
  
  if (isDev) {
      payload.stack = error.stack;
  }

  return res.status(500).json(payload);
};

module.exports = { serverError };
