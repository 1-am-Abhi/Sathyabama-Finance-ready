const axios = require('axios');
const AcademicMetric = require('../models/AcademicMetric');
const User = require('../models/User');

const syncScopusData = async (facultyId, scopusId) => {
    try {
        const apiKey = process.env.SCOPUS_API_KEY;
        if (!apiKey) {
            console.log('Scopus API key not configured. Skipping sync.');
            return { success: false, message: 'Scopus API Key missing' };
        }

        // Example URL: https://api.elsevier.com/content/search/scopus?query=AU-ID(scopusId)
        const response = await axios.get(`https://api.elsevier.com/content/search/scopus`, {
            params: {
                query: `AU-ID(${scopusId})`,
                count: 100 // Example pagination
            },
            headers: {
                'X-ELS-APIKey': apiKey,
                'Accept': 'application/json'
            }
        });

        const entries = response.data['search-results']?.entry || [];
        
        let journals = 0;
        let proceedings = 0;
        let books = 0;
        let bookChapters = 0;

        // Categorize publications
        entries.forEach(entry => {
            const aggType = entry['prism:aggregationType'] || '';
            const subType = entry['subtypeDescription'] || '';
            
            if (aggType === 'Journal') journals++;
            else if (aggType === 'Conference Proceeding') proceedings++;
            else if (aggType === 'Book Series' || aggType === 'Book') {
                if (subType === 'Book Chapter') bookChapters++;
                else books++;
            }
            // Can map more based on Elsevier schema
        });

        // Upsert AcademicMetric
        const [metric, created] = await AcademicMetric.findOrCreate({
            where: { facultyId, cycle: '2024-25' },
            defaults: { 
                journals, proceedings, books, bookChapters,
                status: 'APPROVED' // Auto-approve system-verified data
            }
        });

        if (!created) {
            await metric.update({ journals, proceedings, books, bookChapters });
        }

        return { success: true, data: { journals, proceedings, books, bookChapters } };
    } catch (error) {
        console.error('Error syncing with Scopus API:', error.message);
        return { success: false, message: error.message };
    }
};

module.exports = {
    syncScopusData
};
