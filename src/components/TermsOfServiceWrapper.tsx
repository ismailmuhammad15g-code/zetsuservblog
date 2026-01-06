import React, { useState, useEffect } from 'react';
import TermsOfService, { hasAcceptedTerms } from './TermsOfService';

interface TermsOfServiceWrapperProps {
    children: React.ReactNode;
}

const TermsOfServiceWrapper: React.FC<TermsOfServiceWrapperProps> = ({ children }) => {
    const [showTerms, setShowTerms] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Check if terms have been accepted
        const accepted = hasAcceptedTerms();
        setShowTerms(!accepted);
        setIsChecking(false);
    }, []);

    const handleAccept = () => {
        setShowTerms(false);
    };

    const handleReject = () => {
        // Redirect to home page if they reject
        window.location.href = '/';
    };

    // Don't render anything while checking
    if (isChecking) {
        return null;
    }

    return (
        <>
            {children}
            {showTerms && (
                <TermsOfService
                    onAccept={handleAccept}
                    onReject={handleReject}
                />
            )}
        </>
    );
};

export default TermsOfServiceWrapper;
