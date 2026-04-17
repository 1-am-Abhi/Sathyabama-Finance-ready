const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Automatically mount all route files in a directory to an Express router
 * @param {express.Router} mainRouter - The Express router to mount onto
 * @param {string} routesDir - Absolute path to the routes directory
 */
const mountRoutes = (mainRouter, routesDir) => {
    logger.info(`[Router] Starting automated route registration from: ${routesDir}`);
    
    fs.readdirSync(routesDir).forEach(file => {
        if (file.endsWith('Routes.js')) {
            const fileNamePrefix = file.replace('Routes.js', '');
            // Convert camelCase or PascalCase to kebab-case
            const kebabName = fileNamePrefix
                .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
                .toLowerCase();
            
            const routePath = path.join(routesDir, file);
            
            try {
                const router = require(routePath);
                
                let mountPoint = `/${kebabName}`;
                
                // Special Override Mappings for specific legacy/UI requirements
                if (kebabName === 'faculty-portal') mountPoint = '/faculty';
                if (kebabName === 'academic-metric') mountPoint = '/academic-metrics';
                if (kebabName === 'fund-request') mountPoint = '/fund-requests';
                if (kebabName === 'event-request') mountPoint = '/event-requests';
                if (kebabName === 'equipment-request') mountPoint = '/equipment-requests';
                if (kebabName === 'od-request') mountPoint = '/od-requests';
                if (kebabName === 'notification') mountPoint = '/notifications';
                if (kebabName === 'project') mountPoint = '/projects';
                if (kebabName === 'document') mountPoint = '/documents';
                if (kebabName === 'faculty-request') mountPoint = '/'; // Root mounting for admin/finance/faculty generic routes
                
                mainRouter.use(mountPoint, router);
                logger.info(`[Router] Mounted ${file} at ${mountPoint}`);
            } catch (error) {
                logger.error(`[Router] Failed to mount ${file}: ${error.message}`);
            }
        }
    });
};

module.exports = { mountRoutes };
