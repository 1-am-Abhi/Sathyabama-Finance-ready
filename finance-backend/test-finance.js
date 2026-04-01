const { connectDB } = require('./src/config/db');
const PFMSTransaction = require('./src/models/PFMSTransaction');
const InternshipFee = require('./src/models/InternshipFee');
const { FundRequest } = require('./src/models/FundRequest');

const verifyFinance = async () => {
    try {
        await connectDB();
        console.log('--- DB Connected ---');
        
        const pfmsCount = await PFMSTransaction.count();
        const internCount = await InternshipFee.count();
        const fundResCount = await FundRequest.count();
        
        console.log(`PFMS Transactions: ${pfmsCount}`);
        console.log(`Internship Fees: ${internCount}`);
        console.log(`Fund Requests: ${fundResCount}`);
        
        console.log('--- Finance Verification Success ---');
        process.exit(0);
    } catch (error) {
        console.error('--- Verification Failed ---');
        console.error(error);
        process.exit(1);
    }
};

verifyFinance();
