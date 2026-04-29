const logger = require('../utils/logger');
const xlsx = require('xlsx');
const { User } = require('../models');
const { Op } = require('sequelize');

/**
 * POST /api/faculty/preview
 * Previews faculty data from uploaded Excel file.
 */
exports.previewFaculties = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = xlsx.utils.sheet_to_json(worksheet);

        // Fetch existing users to check for duplicates
        const existingUsers = await User.findAll({ attributes: ['email', 'name'], raw: true });
        const existingEmails = new Set((existingUsers || []).map(u => String(u.email || '').toLowerCase().trim()));
        const existingNames = new Set((existingUsers || []).map(u => String(u.name || '').toLowerCase().trim()));

        const previewData = (rawData || []).map(row => {
            // AI DATA CLEANER Logic
            let emailRaw = String(row['EMAIL ID'] || '').trim().toLowerCase();
            let email = emailRaw.split(/[,/]/)[0].trim();
            
            let name = String(row['NAME OF THE SATFF MEMBE'] || '').trim();
            // Fix spacing and title case for name
            name = name.replace(/\s+/g, ' '); // remove multiple spaces
            name = name.replace(/Dr\.\s*S\.\s*/gi, 'Dr. S. '); // specific spacing fix
            
            // basic title case
            name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

            let department = String(row['Department'] || row['DEPARTMENT'] || '').trim();
            let phone = row['MOBILE NUMBER'] ? String(row['MOBILE NUMBER']).trim() : '';
            let designation = String(row['Designation'] || row['DESIGNATION'] || '').trim();

            const errors = [];
            if (!email || !email.includes('@')) errors.push('Invalid email format');
            if (!name) errors.push('Missing staff name');
            if (!department) errors.push('Missing department');

            // DUPLICATE DETECTION
            let isDuplicate = false;
            let duplicateType = null;
            
            if (existingEmails.has(email)) {
                isDuplicate = true;
                duplicateType = 'email';
                errors.push('Account with this email already exists');
            } else if (existingNames.has(name.toLowerCase())) {
                isDuplicate = true;
                duplicateType = 'name';
                errors.push('Account with this name already exists');
            }

            return {
                name,
                email,
                phone,
                department,
                designation,
                isValid: errors.length === 0,
                isDuplicate,
                duplicateType,
                errors,
                originalRow: row
            };
        });

        return res.json({ success: true, data: previewData });
    } catch (error) {
        logger.error('[FacultyController] previewFaculties error:', error);
        return res.status(500).json({ success: false, message: 'Error processing Excel file: ' + error.message });
    }
};

/**
 * POST /api/faculty/upload-final
 * Saves validated faculty records to the database.
 */
exports.uploadFacultiesFinal = async (req, res) => {
    try {
        const { faculties } = req.body;
        
        if (!Array.isArray(faculties)) {
            return res.status(400).json({ success: false, message: 'Invalid data format. Expected an array of faculty objects.' });
        }

        let addedCount = 0;
        let skippedCount = 0;

        for (const faculty of faculties) {
            if (!faculty.isValid || faculty.isDuplicate) {
                skippedCount++;
                continue;
            }

            try {
                const [user, created] = await User.findOrCreate({
                    where: { email: faculty.email.toLowerCase().trim() },
                    defaults: {
                        name: faculty.name,
                        password: 'Password@2026', // Standard institutional default
                        role: 'FACULTY',
                        department: faculty.department,
                        centre: faculty.department,
                        phone: faculty.phone,
                        designation: faculty.designation,
                        status: 'Active',
                        isProfileCompleted: false
                    }
                });

                if (created) addedCount++;
                else skippedCount++;
            } catch (err) {
                logger.error(`[FacultyController] Failed to create faculty ${faculty.email}:`, err.message);
                skippedCount++;
            }
        }

        return res.json({
            success: true,
            message: `Batch operation complete. Created: ${addedCount}, Skipped: ${skippedCount}.`,
            data: {
                addedCount,
                skippedCount
            }
        });
    } catch (error) {
        logger.error('[FacultyController] uploadFacultiesFinal error:', error);
        return res.status(500).json({ success: false, message: 'Institutional batch upload failed: ' + error.message });
    }
};
