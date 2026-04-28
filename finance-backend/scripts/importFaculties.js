require('dotenv').config({ path: __dirname + '/../.env' });
const xlsx = require('xlsx');
const { connectDB } = require('../src/config/db');
const { User } = require('../src/models');

async function importFaculties() {
    await connectDB();
    
    const filePath = '/Users/abhijeetkumar/Downloads/Sathyabama-Finance(Frontend)/IRC Faculty Details-26 April.xlsx';
    console.log('Reading Excel File:', filePath);
    
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    console.log(`Found ${data.length} records. Processing...`);

    let added = 0;
    let updated = 0;

    for (const row of data) {
        let email = row['EMAIL ID']?.toString().trim();
        if (email) {
            email = email.split(/[,/]/)[0].trim();
        }
        const name = row['NAME OF THE SATFF MEMBE']?.toString().trim();
        const department = row['Department']?.toString().trim();
        const mobile = row['MOBILE NUMBER']?.toString().trim() || null;
        const designation = row['Designation']?.toString().trim() || null;
        const employeeId = row['ERP STAFF CODE  (IF AVAILABLE)']?.toString().trim() || null;
        const password = row['Password']?.toString().trim() || '12345';
        
        if (!email || !name) continue;

        try {
            let user = await User.findOne({ where: { email } });

            if (user) {
                // Update existing user
                user.name = name;
                user.department = department;
                user.phone = mobile;
                user.designation = designation;
                if (employeeId) {
                    const existingEmp = await User.findOne({ where: { employeeId } });
                    if (!existingEmp || existingEmp.id === user.id) {
                        user.employeeId = employeeId;
                    }
                }
                user.password = password; // Let the hook hash it
                await user.save();
                updated++;
            } else {
                // Create new user
                let empIdToSet = employeeId;
                if (employeeId) {
                    const existingEmp = await User.findOne({ where: { employeeId } });
                    if (existingEmp) empIdToSet = null;
                }
                await User.create({
                    name,
                    email,
                    department,
                    phone: mobile,
                    designation,
                    employeeId: empIdToSet,
                    role: 'FACULTY',
                    password,
                    status: 'Active'
                });
                added++;
            }
        } catch (err) {
            console.error(`Failed to process ${email}:`, err.message);
        }
    }

    console.log(`Import complete! Added: ${added}, Updated: ${updated}`);
    process.exit(0);
}

importFaculties().catch(err => {
    console.error('Import failed:', err);
    process.exit(1);
});
