const logger = require('./utils/logger');
const { sequelize } = require('./config/db');
const Project = require('./models/Project');
const ProjectMember = require('./models/ProjectMember');

async function syncProjectMembers() {
    try {
        logger.info('Starting PI member synchronization...');
        const projects = await Project.findAll();
        
        for (const project of projects) {
            const userId = project.facultyId || project.userId;
            const projectId = project._id || project.id;
            
            if (!userId || !projectId) {
                logger.info(`Skipping project ${project.id || project._id}: No userId or projectId`);
                continue;
            }

            const existingPi = await ProjectMember.findOne({
                where: {
                    projectId: projectId,
                    userId: userId,
                    role: 'PI'
                }
            });

            if (!existingPi) {
                logger.info(`Adding PI for project ${projectId} (Faculty: ${userId})`);
                await ProjectMember.create({
                    projectId: projectId,
                    userId: userId,
                    role: 'PI'
                });
            }
        }
        logger.info('Synchronization complete.');
    } catch (error) {
        logger.error('Sync failed:', error);
    } finally {
        process.exit();
    }
}

syncProjectMembers();
