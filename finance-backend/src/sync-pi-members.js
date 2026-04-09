const { sequelize } = require('./config/db');
const Project = require('./models/Project');
const ProjectMember = require('./models/ProjectMember');

async function syncProjectMembers() {
    try {
        console.log('Starting PI member synchronization...');
        const projects = await Project.findAll();
        
        for (const project of projects) {
            const userId = project.facultyId || project.userId;
            const projectId = project._id || project.id;
            
            if (!userId || !projectId) {
                console.log(`Skipping project ${project.id || project._id}: No userId or projectId`);
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
                console.log(`Adding PI for project ${projectId} (Faculty: ${userId})`);
                await ProjectMember.create({
                    projectId: projectId,
                    userId: userId,
                    role: 'PI'
                });
            }
        }
        console.log('Synchronization complete.');
    } catch (error) {
        console.error('Sync failed:', error);
    } finally {
        process.exit();
    }
}

syncProjectMembers();
