export const seedAllData = () => {
    // 1. My Projects (FacultyProjects.jsx)
    if (!localStorage.getItem('facultyProjects')) {
        const projects = [
            {
                id: 'PROJ-2024-001',
                type: 'PROJECT',
                title: 'AI-Driven Traffic Management System for Smart Cities',
                department: 'Computer Science',
                budget: 1500000,
                utilized: 600000,
                status: 'ONGOING',
                progress: 45,
                startDate: '2024-02-10',
                abstract: 'IoT based real-time traffic monitoring and control system.'
            },
            {
                id: 'PUB-2023-102',
                type: 'PUBLICATION',
                title: 'Deep Learning Approaches in Genomic Sequence Analysis',
                department: 'Bioinformatics',
                publisher: 'Nature Computational Science',
                status: 'PUBLISHED',
                year: 2023,
                abstract: 'A comparative study of CNN and RNN models for DNA sequencing.'
            },
            {
                id: 'BOOK-2022-05',
                type: 'BOOK',
                title: 'Modern Cloud Computing Algorithms',
                publisher: 'Oxford University Press',
                year: 2022,
                status: 'PUBLISHED'
            },
            {
                id: 'CONF-2024-12',
                type: 'CONFERENCE',
                title: 'Sustainable Energy Solutions for Rural India',
                publisher: 'IEEE International Conference on Power (ICP)',
                year: 2024,
                status: 'PUBLISHED'
            },
            {
                id: 'PROJ-2022-09',
                type: 'PROJECT',
                title: 'Water Quality Monitoring using Wireless Sensor Networks',
                department: 'Civil Engineering',
                budget: 800000,
                utilized: 800000,
                status: 'COMPLETED',
                progress: 100,
                startDate: '2022-06-15',
                abstract: 'Deployed sensor nodes in 5 villages to monitor water safety.'
            },
            {
                id: 'PAT-2023-01',
                type: 'PATENT',
                title: 'Novel Biodegradable Polymer Composite for Packaging',
                status: 'GRANTED',
                year: 2023,
                publisher: 'Indian Patent Office'
            }
        ];
        localStorage.setItem('facultyProjects', JSON.stringify(projects));
    }

    // 2. Revenue Generated - Always refresh to ensure up-to-date mock data
    {
        const revenue = [
            // 2026 records (current year - shows by default)
            {
                id: 'REV-2601',
                title: 'AI-Powered Clinical Decision Support System',
                revenueSource: 'Consultancy',
                clientName: 'Apollo Hospitals Ltd',
                amountGenerated: 1800000,
                revenueDate: '2026-01-18',
                year: 2026,
                facultyName: 'Dr. Priya Sharma',
                description: 'AI model integration for ICU patient monitoring and risk prediction.',
                status: 'Received'
            },
            {
                id: 'REV-2602',
                title: 'Industry Training: Deep Learning for Engineers',
                revenueSource: 'Industry',
                clientName: 'Tata Consultancy Services',
                amountGenerated: 480000,
                revenueDate: '2026-02-10',
                year: 2026,
                facultyName: 'Dr. Priya Sharma',
                description: '5-day intensive bootcamp on DL frameworks for 120 TCS engineers.',
                status: 'Received'
            },
            {
                id: 'REV-2603',
                title: 'Smart Grid Fault Detection System',
                revenueSource: 'Projects',
                clientName: 'Tangedco',
                amountGenerated: 2500000,
                revenueDate: '2026-01-05',
                year: 2026,
                facultyName: 'Dr. Priya Sharma',
                description: 'Sponsored research on AI-based anomaly detection in power grids.',
                status: 'Received'
            },
            {
                id: 'REV-2604',
                title: 'Technozarre 2026 Symposium',
                revenueSource: 'Events',
                clientName: 'Multiple Corporate Sponsors',
                amountGenerated: 650000,
                revenueDate: '2026-03-01',
                year: 2026,
                facultyName: 'Dr. Priya Sharma',
                description: 'National-level annual tech symposium with 2000+ participants.',
                status: 'Pending'
            },
            {
                id: 'REV-2605',
                title: 'Water Purity Testing - Municipal Corp',
                revenueSource: 'Analysis',
                clientName: 'Greater Chennai Corporation',
                amountGenerated: 95000,
                revenueDate: '2026-02-22',
                year: 2026,
                facultyName: 'Dr. Priya Sharma',
                description: 'Quarterly water sample analysis across 12 zones.',
                status: 'Received'
            },
            // 2025 records
            {
                id: 'REV-2501',
                title: 'Structural Health Monitoring for Bridges',
                revenueSource: 'Consultancy',
                clientName: 'NHAI',
                amountGenerated: 2200000,
                revenueDate: '2025-07-15',
                year: 2025,
                facultyName: 'Dr. Priya Sharma',
                description: 'IoT sensor deployment and structural analysis for 4 NH bridges.',
                status: 'Received'
            },
            {
                id: 'REV-2502',
                title: 'Python & ML Bootcamp for Wipro',
                revenueSource: 'Industry',
                clientName: 'Wipro Ltd',
                amountGenerated: 350000,
                revenueDate: '2025-04-20',
                year: 2025,
                facultyName: 'Dr. Priya Sharma',
                description: '3-day upskilling program for 80 freshers.',
                status: 'Received'
            },
            {
                id: 'REV-2503',
                title: 'National Conference on AI in Healthcare',
                revenueSource: 'Events',
                clientName: 'DST India',
                amountGenerated: 800000,
                revenueDate: '2025-09-12',
                year: 2025,
                facultyName: 'Dr. Priya Sharma',
                description: 'Two-day national conference with 500+ delegates.',
                status: 'Received'
            },
            // 2024 records
            {
                id: 'REV-1001',
                title: 'Corporate Training on Data Science',
                revenueSource: 'Industry',
                clientName: 'Infosys Ltd',
                amountGenerated: 250000,
                revenueDate: '2024-03-15',
                year: 2024,
                facultyName: 'Dr. Priya Sharma',
                description: '3-day workshop for entry-level engineers.',
                status: 'Received'
            },
            {
                id: 'REV-1002',
                title: 'Soil Stability Analysis for Metro Phase 2',
                revenueSource: 'Consultancy',
                clientName: 'Chennai Metro Rail Ltd (CMRL)',
                amountGenerated: 1200000,
                revenueDate: '2024-06-20',
                year: 2024,
                facultyName: 'Dr. Priya Sharma',
                description: 'Geotechnical investigation and reporting.',
                status: 'Received'
            },
            {
                id: 'REV-1003',
                title: 'Annual Tech Symposium Sponsorship',
                revenueSource: 'Events',
                clientName: 'Multiple Sponsors',
                amountGenerated: 500000,
                revenueDate: '2024-01-25',
                year: 2024,
                facultyName: 'Dr. Priya Sharma',
                description: 'Sponsorship for Technozarre 2024.',
                status: 'Received'
            },
            {
                id: 'REV-1004',
                title: 'AI Model License Fee',
                revenueSource: 'Projects',
                clientName: 'StartUp Inc',
                amountGenerated: 750000,
                revenueDate: '2024-09-05',
                year: 2024,
                facultyName: 'Dr. Priya Sharma',
                description: 'Technology transfer and licensing agreement.',
                status: 'Received'
            }
        ];
        localStorage.setItem('revenueRecords', JSON.stringify(revenue));
    }

    // 3. Equipment and Consumable (FinancialRecordsDashboard.jsx)
    if (!localStorage.getItem('equipmentRequests')) {
        const equipment = [
            {
                id: 1707890123456,
                projectId: 1,
                projectName: 'AI Research Lab Setup',
                equipmentName: 'NVIDIA A100 GPU Server',
                quantity: 1,
                requestType: 'Purchase',
                requestedAmount: 1800000,
                approvedAmount: 1800000,
                status: 'Funds Released',
                createdAt: '2023-09-10T10:00:00.000Z',
                approvalDate: '2023-09-20'
            },
            {
                id: 1707890123457,
                projectId: 2,
                projectName: 'Bio-Medical Sensor Analysis',
                equipmentName: 'High Precision Oscilloscope',
                quantity: 5,
                requestType: 'Purchase',
                requestedAmount: 250000,
                approvedAmount: 200000,
                status: 'Approved',
                createdAt: '2024-01-15T14:30:00.000Z',
                approvalDate: '2024-01-18'
            },
            {
                id: 1707890123458,
                projectId: 1,
                projectName: 'AI Research Lab Setup',
                equipmentName: 'Lab Consumables (Cables, Connectors)',
                quantity: 100,
                requestType: 'Purchase',
                requestedAmount: 50000,
                approvedAmount: 0,
                status: 'Pending',
                createdAt: '2024-02-10T09:15:00.000Z',
                approvalDate: null
            },
            {
                id: 1707890123459,
                projectId: 3,
                projectName: 'IoT Smart Campus',
                equipmentName: 'Raspberry Pi 4 Model B Kits',
                quantity: 20,
                requestType: 'Funding',
                requestedAmount: 120000,
                approvedAmount: 0,
                status: 'Rejected',
                remarks: 'Budget constraints for this quarter.',
                createdAt: '2023-11-05T11:20:00.000Z',
                approvalDate: null
            }
        ];
        localStorage.setItem('equipmentRequests', JSON.stringify(equipment));
    }

    // 4. Academic Support (AcademicSupportDashboard.jsx)
    // Always seed/update Academic Support data for demo purposes
    const academicData = {
        "1_2024-25": {
            sectionA: {
                theorySubjects: 3,
                practicalSubjects: 2,
                ugProjects: 12,
                pgProjects: 4,
                internships: 5,
                phdOngoing: 3,
                phdCompleted: 1,
                examDuty: 4
            },
            sectionB: {
                internationalVisit: "Visited National University of Singapore for a collaborative research discussion on AI in Healthcare (Aug 2024). presented a paper on 'AI in Diagnostics'.",
                fellowship: "Awarded IEEE Senior Member Fellowship for contribution to Engineering Education.",
                coordinators: "NAAC Criteria 3 Coordinator",
                yearCoordinator: "IV Year CSE B",
                grants: "Reviewer for Springer Journal of Supercomputing. Received a travel grant of ₹50,000 from DST for attending an international conference.",
                anyContribution: "Organized a National Level Hackathon 'Sathyabama Hacks 2024' with over 500 participants."
            }
        },
        "1_2023-24": {
            sectionA: {
                theorySubjects: 4,
                practicalSubjects: 2,
                ugProjects: 10,
                pgProjects: 2,
                internships: 2,
                phdOngoing: 2,
                phdCompleted: 0,
                examDuty: 6
            },
            sectionB: {
                internationalVisit: "",
                fellowship: "Received 'Best Faculty Award' from the department for academic excellence.",
                coordinators: "Department Time Table Coordinator",
                yearCoordinator: "III Year CSE A",
                grants: "Submitted a proposal to minimal grant (failed), but Reviewer for IEEE Access.",
                anyContribution: "Published 3 patents in the field of IoT. Mentored a student team that won 2nd prize in Smart India Hackathon."
            }
        },
        "1_2022-23": {
            sectionA: {
                theorySubjects: 4,
                practicalSubjects: 3,
                ugProjects: 8,
                pgProjects: 1,
                internships: 0,
                phdOngoing: 1,
                phdCompleted: 0,
                examDuty: 8
            },
            sectionB: {
                internationalVisit: "",
                fellowship: "",
                coordinators: "Exam Cell Member",
                yearCoordinator: "II Year CSE C",
                grants: "",
                anyContribution: "Co-authored a book chapter on 'Cloud Computing Security'. Organized a 5-day FDP on 'Data Science using Python'."
            }
        }
    };

    // Merge with existing data to avoid wiping other potential users (if any), 
    // but overwrite the test user data.
    const existingAcademicData = JSON.parse(localStorage.getItem('academicSupportData') || '{}');
    const mergedAcademicData = { ...existingAcademicData, ...academicData };

    localStorage.setItem('academicSupportData', JSON.stringify(mergedAcademicData));
};
