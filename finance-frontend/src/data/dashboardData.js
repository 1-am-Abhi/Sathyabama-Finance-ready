// ==========================================
// DASHBOARD DATA - EDIT THIS FILE TO CHANGE DATA
// ==========================================

export const RESEARCH_CENTRES = [
    'Centre for Nano Science and Nanotechnology',
    'Centre of Excellence for Energy Research',
    'Centre for Waste Management',
    'Centre for Climate Studies',
    'Centre for Molecular and Nanomedical Sciences',
    'Centre for Drug Discovery and Development',
    'Centre of Excellence for Additive Manufacturing',
    'Centre for Indian System of Medicine',
    'Centre for Aqua Culture'
];

export const CENTRE_STATS_MOCK = {
    'Centre for Nano Science and Nanotechnology': { total: 12, active: 8, completed: 3, budget: 35, disbursed: 25, faculty: 15 },
    'Centre of Excellence for Energy Research': { total: 10, active: 7, completed: 2, budget: 28, disbursed: 20, faculty: 12 },
    'Centre for Waste Management': { total: 8, active: 5, completed: 2, budget: 22, disbursed: 16, faculty: 10 },
    'Centre for Climate Studies': { total: 10, active: 6, completed: 3, budget: 25, disbursed: 18, faculty: 11 },
    'Centre for Molecular and Nanomedical Sciences': { total: 7, active: 4, completed: 2, budget: 20, disbursed: 14, faculty: 8 },
    'Centre for Drug Discovery and Development': { total: 8, active: 5, completed: 2, budget: 17, disbursed: 12, faculty: 9 },
    'Centre of Excellence for Additive Manufacturing': { total: 6, active: 4, completed: 1, budget: 15, disbursed: 10, faculty: 7 },
    'Centre for Indian System of Medicine': { total: 5, active: 3, completed: 1, budget: 13, disbursed: 9, faculty: 6 },
    'Centre for Aqua Culture': { total: 6, active: 4, completed: 2, budget: 18, disbursed: 12, faculty: 8 }
};

export const FUNDING_STATS = {
    pfms: {
        sanctioned: 50000000, // 5 Cr
        received: 35000000,   // 3.5 Cr
        consumed: 21000000,   // 2.1 Cr
        balance: 14000000     // 1.4 Cr
    },
    institutional: {
        allocated: 20000000,  // 2 Cr
        utilized: 12000000,   // 1.2 Cr
        balance: 8000000      // 0.8 Cr
    }
};

export const CENTRE_PROJECTS_MOCK = {
    'Centre for Aqua Culture': [
        { id: 1, name: 'Sustainable Shrimp Farming', pi: 'Dr. Kumar', status: 'Active', budget: 500000, released: 350000, utilized: 250000 },
        { id: 2, name: 'Fish Disease Management', pi: 'Dr. Sharma', status: 'Active', budget: 400000, released: 300000, utilized: 200000 },
        { id: 3, name: 'Coastal Aquaculture Development', pi: 'Dr. Patel', status: 'Active', budget: 350000, released: 250000, utilized: 180000 },
        { id: 4, name: 'Marine Biodiversity Study', pi: 'Dr. Reddy', status: 'Active', budget: 300000, released: 200000, utilized: 150000 },
        { id: 5, name: 'Aquatic Feed Optimization', pi: 'Dr. Singh', status: 'Completed', budget: 250000, released: 250000, utilized: 240000 },
        { id: 6, name: 'Water Quality Monitoring', pi: 'Dr. Rao', status: 'Completed', budget: 200000, released: 200000, utilized: 195000 }
    ],
    'default': [
        { id: 1, name: 'Research Project Alpha', pi: 'Dr. Smith', status: 'Active', budget: 500000, released: 350000, utilized: 250000 },
        { id: 2, name: 'Innovation Initiative Beta', pi: 'Dr. Johnson', status: 'Active', budget: 400000, released: 300000, utilized: 200000 },
        { id: 3, name: 'Development Program Gamma', pi: 'Dr. Williams', status: 'Completed', budget: 300000, released: 300000, utilized: 290000 }
    ]
};

export const CENTRE_FACULTY_MOCK = {
    'Centre for Aqua Culture': [
        { id: 1, name: 'Dr. Rajesh Kumar', role: 'Professor', projects: 2, specialization: 'Marine Biology' },
        { id: 2, name: 'Dr. Priya Sharma', role: 'Associate Professor', projects: 1, specialization: 'Aquatic Pathology' },
        { id: 3, name: 'Dr. Anil Patel', role: 'Assistant Professor', projects: 1, specialization: 'Coastal Ecology' },
        { id: 4, name: 'Dr. Suresh Reddy', role: 'Professor', projects: 1, specialization: 'Fish Genetics' },
        { id: 5, name: 'Dr. Meena Singh', role: 'Associate Professor', projects: 1, specialization: 'Aquaculture Engineering' },
        { id: 6, name: 'Dr. Vijay Rao', role: 'Assistant Professor', projects: 1, specialization: 'Water Chemistry' },
        { id: 7, name: 'Dr. Lakshmi Iyer', role: 'Research Fellow', projects: 0, specialization: 'Aquatic Nutrition' },
        { id: 8, name: 'Dr. Ramesh Nair', role: 'Research Fellow', projects: 0, specialization: 'Fisheries Management' }
    ],
    'default': [
        { id: 1, name: 'Dr. John Doe', role: 'Professor', projects: 2, specialization: 'Research' },
        { id: 2, name: 'Dr. Jane Smith', role: 'Associate Professor', projects: 1, specialization: 'Development' },
        { id: 3, name: 'Dr. Bob Johnson', role: 'Assistant Professor', projects: 1, specialization: 'Innovation' }
    ]
};

export const FUND_REQUESTS_MOCK = [
    {
        id: 1,
        projectTitle: 'AI-Powered Medical Diagnosis System',
        faculty: 'Dr. Priya Sharma',
        requestedAmount: 1500000,
        purpose: 'Equipment purchase and software licenses',
        submittedDate: '2024-01-25',
        status: 'PENDING',
        chequeStatus: 'Pending',
        department: 'CSE',
        centre: 'Centre for Nano Science and Nanotechnology',
        source: 'PFMS'
    },
    {
        id: 2,
        projectTitle: 'Smart Traffic Management System',
        faculty: 'Dr. Vikram Singh',
        requestedAmount: 2000000,
        purpose: 'Hardware components and field testing',
        submittedDate: '2024-01-22',
        status: 'PENDING',
        chequeStatus: 'Pending',
        department: 'ECE',
        centre: 'Centre for Climate Studies',
        source: "Director's Innovation"
    },
    {
        id: 3,
        projectTitle: 'Renewable Energy Grid Optimization',
        faculty: 'Dr. Bharathi',
        requestedAmount: 300000,
        purpose: 'Research equipment and data collection',
        submittedDate: '2024-01-20',
        status: 'APPROVED',
        chequeStatus: 'Pending',
        department: 'EEE',
        centre: 'Centre of Excellence for Energy Research',
        source: 'PFMS'
    },
    {
        id: 4,
        projectTitle: 'Waste to Energy Conversion',
        faculty: 'Dr. Anita Desai',
        requestedAmount: 500000,
        purpose: 'Lab Setup',
        submittedDate: '2024-01-10',
        status: 'APPROVED',
        chequeStatus: 'Approved',
        department: 'CHEM',
        centre: 'Centre for Waste Management',
        source: "Director's Innovation"
    },
    {
        id: 5,
        projectTitle: 'Ocean Data Buoys',
        faculty: 'Dr. R. Kumar',
        requestedAmount: 1200000,
        purpose: 'Field deployment',
        submittedDate: '2024-01-05',
        status: 'APPROVED',
        chequeStatus: 'Disbursed',
        department: 'OCEAN',
        centre: 'Centre for Ocean Research',
        source: 'PFMS'
    }
];
