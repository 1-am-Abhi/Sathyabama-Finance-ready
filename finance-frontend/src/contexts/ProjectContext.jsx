import React, { createContext, useState, useContext } from 'react';
import { FUND_REQUESTS_MOCK } from '../data/dashboardData';

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
    const [projects, setProjects] = useState(FUND_REQUESTS_MOCK);

    const updateProjectStatus = (id, newStatus) => {
        setProjects(prevProjects =>
            prevProjects.map(project =>
                project.id === id ? { ...project, status: newStatus } : project
            )
        );
    };

    const getProjects = () => projects;

    return (
        <ProjectContext.Provider value={{ projects, updateProjectStatus, getProjects }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProjects = () => useContext(ProjectContext);
