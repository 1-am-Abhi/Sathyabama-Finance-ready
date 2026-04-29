const logger = require('./utils/logger');
let io;

/**
 * Socket.IO Instance Manager
 * Replaces global.io to prevent architecture leakage and support better scaling.
 */
module.exports = {
    /**
     * Initialize the socket instance.
     * @param {object} instance - The Socket.IO server instance.
     */
    setIO: (instance) => {
        io = instance;
    },

    /**
     * Retrieve the active socket instance.
     * @returns {object|null} The Socket.IO instance or null if not set.
     */
    getIO: () => {
        if (!io) {
            logger.warn('[SocketInstance] Attempted to getIO before initialization.');
        }
        return io;
    },

    /**
     * Safe emission wrapper
     * Prevents socket failures from interrupting the main execution thread.
     */
    safeEmit: (room, event, payload) => {
        if (!io) return;
        try {
            io.to(room).emit(event, payload);
        } catch (err) {
            logger.error(`[SocketInstance] Failed to emit to room ${room}:`, err.message);
        }
    }
};
