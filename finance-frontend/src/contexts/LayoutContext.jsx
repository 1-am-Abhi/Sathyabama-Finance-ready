import React, { createContext, useState, useContext } from 'react';

const LayoutContext = createContext();

export const LayoutProvider = ({ children }) => {
    const [title, setTitle] = useState("Dashboard");
    const [description, setDescription] = useState("");
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const setLayout = (newTitle, newDescription) => {
        setTitle(newTitle);
        if (newDescription) setDescription(newDescription);
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <LayoutContext.Provider value={{ title, description, setLayout, isSidebarOpen, toggleSidebar }}>
            {children}
        </LayoutContext.Provider>
    );
};

export const useLayout = () => useContext(LayoutContext);

export default LayoutContext;
