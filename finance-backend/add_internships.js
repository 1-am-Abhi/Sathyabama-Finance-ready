const { sequelize } = require('./src/config/db');
const InternshipFee = require('./src/models/InternshipFee');

const generateTestInternships = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB...');

        const demoData = [
            {
                studentName: 'Rahul Kumar',
                studentId: 'STU2024001',
                internshipTitle: 'Summer Research Internship',
                feeAmount: 5000,
                paymentStatus: 'PENDING'
            },
            {
                studentName: 'Priya Sharma',
                studentId: 'STU2024002',
                internshipTitle: 'AI Lab Internship',
                feeAmount: 7500,
                paymentStatus: 'PENDING'
            },
            {
                studentName: 'Amit Patel',
                studentId: 'STU2024003',
                internshipTitle: 'IoT Research Internship',
                feeAmount: 5000,
                paymentStatus: 'PENDING'
            }
        ];

        for (const data of demoData) {
            await InternshipFee.create(data);
            console.log(`Created Pending Internship Record for: ${data.studentName}`);
        }

        console.log('Successfully generated test internship records.');
        process.exit(0);
    } catch (error) {
        console.error('Error generating internships:', error);
        process.exit(1);
    }
};

generateTestInternships();
