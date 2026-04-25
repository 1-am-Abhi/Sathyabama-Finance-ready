const xlsx = require('xlsx');
const { User } = require('../models');
const { Op } = require('sequelize');

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
        const existingUsers = await User.findAll({ attributes: ['email', 'name'] });
        const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
        const existingNames = new Set(existingUsers.map(u => u.name.toLowerCase()));

        const previewData = rawData.map(row => {
            // PHASE 4: AI DATA CLEANER
            let emailRaw = String(row['EMAIL ID'] || '').trim().toLowerCase();
            let email = emailRaw.split(/[,/]/)[0].trim();
            
            let name = String(row['NAME OF THE SATFF MEMBE'] || '').trim();
            // Fix spacing and title case for name
            name = name.replace(/\s+/g, ' '); // remove multiple spaces
            name = name.replace(/Dr\.\s*S\.\s*/gi, 'Dr. S. '); // specific spacing fix as per example
            // general title case (basic implementation)
            name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

            let department = String(row['Department'] || '').trim();
            let phone = row['MOBILE NUMBER'] ? String(row['MOBILE NUMBER']).trim() : '';
            let designation = String(row['Designation'] || '').trim();

            // PHASE 1: ERROR REPORTING — per-row validation
            const errors = [];
            if (!email || !email.includes('@')) errors.push('Invalid email');
            if (!name) errors.push('Missing name');
            if (!department) errors.push('Missing department');

            const isValid = errors.length === 0;

            // PHASE 5: DUPLICATE DETECTION
            let isDuplicate = false;
            let duplicateType = null;
            
            if (existingEmails.has(email)) {
                isDuplicate = true;
                duplicateType = 'email';
                errors.push('Duplicate email in database');
            } else if (existingNames.has(name.toLowerCase())) {
                isDuplicate = true;
                duplicateType = 'name';
                errors.push('Duplicate name in database');
            }

            return {
                name,
                email,
                phone,
                department,
                designation,
                isValid,
                isDuplicate,
                duplicateType,
                errors,
                originalRow: row
            };
        });

        res.json({ success: true, data: previewData });
    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({ success: false, message: 'Error processing excel file' });
    }
};

exports.uploadFacultiesFinal = async (req, res) => {
    try {
        const { faculties } = req.body;
        
        if (!Array.isArray(faculties)) {
            return res.status(400).json({ success: false, message: 'Invalid data format' });
        }

        let addedCount = 0;
        let skippedCount = 0;

        for (const faculty of faculties) {
            if (!faculty.isValid || faculty.isDuplicate) {
                skippedCount++;
                continue;
            }

            const [user, created] = await User.findOrCreate({
                where: { email: faculty.email },
                defaults: {
                    name: faculty.name,
                    password: 'Password@2026', // Default password
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
        }

        res.json({
            success: true,
            message: `Successfully added ${addedCount} faculties. Skipped ${skippedCount} existing/invalid records.`,
            addedCount,
            skippedCount
        });
    } catch (error) {
        console.error('Final upload error:', error);
        res.status(500).json({ success: false, message: 'Error saving faculties' });
    }
};
