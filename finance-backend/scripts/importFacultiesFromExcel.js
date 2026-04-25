const xlsx = require('xlsx');
const path = require('path');
const { User } = require('../src/models');
const { sequelize } = require('../src/config/db');

// Excel date parsing helper
function parseExcelDate(excelDate) {
    if (!excelDate) return null;
    // Excel dates are days since 1899-12-30 (or 1900-01-01 with a bug)
    // 25569 is the number of days between 1899-12-30 and 1970-01-01
    const jsDate = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    if (isNaN(jsDate)) return null;
    return jsDate.toISOString().split('T')[0];
}

async function importFaculties() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Connected to database.');

        const filePath = path.join(__dirname, 'IRC Faculty Details-26 April.xlsx');
        console.log(`Reading Excel file from ${filePath}...`);
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        console.log(`Found ${data.length} records. Beginning import...`);

        for (const row of data) {
            let emailRaw = String(row['EMAIL ID'] || '').trim().toLowerCase();
            let email = emailRaw.split(/[,/]/)[0].trim();
            
            if (!email) {
                console.log(`Skipping row with missing email: ${row['NAME OF THE SATFF MEMBE']}`);
                continue;
            }

            const name = String(row['NAME OF THE SATFF MEMBE'] || '').trim();
            const employeeId = row['ERP STAFF CODE  (IF AVAILABLE)'] ? String(row['ERP STAFF CODE  (IF AVAILABLE)']).trim() : null;
            const phone = row['MOBILE NUMBER'] ? String(row['MOBILE NUMBER']).trim() : null;
            const department = String(row['Department'] || '').trim();
            const password = row['Password'] ? String(row['Password']).trim() : '12345';
            const designation = String(row['Designation'] || '').trim();
            const joiningDate = typeof row['Joining_Date'] === 'number' ? parseExcelDate(row['Joining_Date']) : null;
            
            const education = [];
            if (row['PG DEGREE']) {
                education.push({ degree: row['PG DEGREE'], specialization: row['PG SPECIALIZATION'] || '' });
            }
            if (row['PH.D.']) {
                education.push({ degree: 'Ph.D.', specialization: row['PH.D.'] });
            }

            const specialization = row['PH.D.'] ? row['PH.D.'] : (row['PG SPECIALIZATION'] || null);

            // Check if user exists
            const existingUser = await User.findOne({ where: { email } });

            if (existingUser) {
                // Update existing user
                await existingUser.update({
                    name,
                    employeeId: employeeId || existingUser.employeeId,
                    phone: phone || existingUser.phone,
                    department: department || existingUser.department,
                    designation: designation || existingUser.designation,
                    joiningDate: joiningDate || existingUser.joiningDate,
                    specialization: specialization || existingUser.specialization,
                    education: education.length > 0 ? education : existingUser.education,
                });
                console.log(`Updated existing user: ${email}`);
            } else {
                // Create new user
                await User.create({
                    name,
                    email,
                    password,
                    role: 'FACULTY',
                    department,
                    centre: department, // Since department name seems to map to centre here
                    employeeId,
                    phone,
                    designation,
                    designationCategory: designation.toUpperCase().includes('ASSISTANT') && !designation.toUpperCase().includes('PROFESSOR') ? 'SCIENTIFIC_ASSISTANT' : 'FACULTY', // Basic mapping
                    joiningDate,
                    specialization,
                    education,
                    status: 'Active',
                    isProfileCompleted: true // Setting to true since the user says "with all the datas given and required even after new faculty logs in"
                });
                console.log(`Created new user: ${email}`);
            }
        }

        console.log('Import completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error importing faculties:', error);
        process.exit(1);
    }
}

importFaculties();
