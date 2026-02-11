import React, { useState } from 'react';

export const TooltipProvider = ({ children }) => <>{children}</>;

export const Tooltip = ({ children }) => {
    const [isVisible, setIsVisible] = useState(false);

    // Clone children to pass state
    const childrenWithProps = React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, { isVisible, setIsVisible });
        }
        return child;
    });

    return <div className="relative inline-block">{childrenWithProps}</div>;
};

export const TooltipTrigger = ({ children, setIsVisible }) => {
    return (
        <div
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            className="inline-flex"
        >
            {children}
        </div>
    );
};

export const TooltipContent = ({ children, isVisible }) => {
    if (!isVisible) return null;
    return (
        <div className="absolute z-50 px-2 py-1 text-xs text-white bg-slate-900 rounded shadow-lg bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap">
            {children}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
        </div>
    );
};
