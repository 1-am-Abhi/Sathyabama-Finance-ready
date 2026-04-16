import React, { useEffect } from 'react';

const UpdateProjectStatusModal = ({ isOpen, project, nextStatuses }) => {
    // existing code...

    useEffect(() => {
        // existing code...
    }, [isOpen, project, nextStatuses]); // updated dependency array

    // existing code...
};

export default UpdateProjectStatusModal;