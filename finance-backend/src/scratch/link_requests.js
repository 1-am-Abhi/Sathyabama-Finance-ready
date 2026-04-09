const { sequelize } = require('../config/db');
const { FundRequest } = require('../models/FundRequest');
const Project = require('../models/Project');
const { Op } = require('sequelize');

async function repairLinks() {
    try {
        console.log('Starting data repair V2: Robust Linking of FundRequests to Projects...');
        
        const requests = await FundRequest.findAll({
            where: { projectId: null }
        });
        
        console.log(`Found ${requests.length} unlinked FundRequests.`);
        
        const allProjects = await Project.findAll();
        console.log(`Available Projects: ${allProjects.length}`);

        let linkedCount = 0;
        for (const req of requests) {
            const reqTitle = (req.projectTitle || '').trim().toLowerCase();
            
            // Try robust match (case-insensitive, trimmed, and partial)
            const project = allProjects.find(p => {
                const pTitle = (p.title || '').trim().toLowerCase();
                return pTitle === reqTitle || pTitle.includes(reqTitle) || reqTitle.includes(pTitle);
            });
            
            if (project) {
                await req.update({ 
                    projectId: project._id || project.id,
                    // Also ensure the title matches exactly if it was a fuzzy match
                    projectTitle: project.title 
                });
                linkedCount++;
                console.log(`Linked Request ${req._id} (${req.projectTitle}) to Project "${project.title}"`);
            } else {
                console.warn(`Could not find project matching "${req.projectTitle}" (Cleaned: "${reqTitle}")`);
            }
        }
        
        console.log(`Successfully linked ${linkedCount} requests.`);
        process.exit(0);
    } catch (error) {
        console.error('Data repair failed:', error);
        process.exit(1);
    }
}

repairLinks();
