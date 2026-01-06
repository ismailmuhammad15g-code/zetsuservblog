import React, { useState, useRef, useEffect } from 'react';

interface TermsOfServiceProps {
    onAccept: () => void;
    onReject?: () => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onAccept, onReject }) => {
    // State to check if user has scrolled to bottom
    const [hasScrolled, setHasScrolled] = useState(false);
    // Checkbox state
    const [isAgreed, setIsAgreed] = useState(false);
    // State to show warning message if user tries to click without scrolling
    const [showScrollError, setShowScrollError] = useState(false);

    // Ref for scroll element
    const scrollRef = useRef<HTMLDivElement>(null);

    // Handle scroll event
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const element = e.currentTarget;
        // Check if user has reached end of text (with small tolerance margin)
        const isBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 5;

        if (isBottom) {
            setHasScrolled(true);
            setShowScrollError(false);
        }
    };

    // Handle checkbox change
    const handleCheckboxChange = () => {
        if (!hasScrolled) {
            // If not scrolled, show warning message
            setShowScrollError(true);
            return; // Prevent checking until scrolled
        }
        setIsAgreed(!isAgreed);
    };

    // Accept terms
    const handleAccept = () => {
        if (isAgreed && hasScrolled) {
            // Save to localStorage
            localStorage.setItem('zetsu_terms_accepted', 'true');
            localStorage.setItem('zetsu_terms_accepted_date', new Date().toISOString());
            onAccept();
        }
    };

    // Reject terms
    const handleReject = () => {
        if (onReject) {
            onReject();
        } else {
            window.location.href = '/';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{
                background: 'radial-gradient(circle at center, #2e1065 0%, #020617 100%)',
                fontFamily: "'Inter', 'Tajawal', sans-serif"
            }}>

            {/* Modal Container */}
            <div
                className="w-[90%] max-w-[450px] p-8 flex flex-col gap-6 relative animate-in fade-in zoom-in-95 duration-500"
                style={{
                    background: 'rgba(20, 20, 25, 0.85)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    borderRadius: '16px',
                    boxShadow: '0 0 40px rgba(124, 58, 237, 0.3), inset 0 0 20px rgba(124, 58, 237, 0.1)'
                }}
            >
                {/* Header */}
                <div className="text-center">
                    <h1
                        className="m-0 text-2xl font-bold uppercase tracking-wider"
                        style={{
                            background: 'linear-gradient(to right, #c084fc, #e879f9)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: '0 0 10px rgba(192, 132, 252, 0.3)'
                        }}
                    >
                        TERMS OF SERVICE
                    </h1>
                </div>

                {/* Scrollable Text Area */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="h-[200px] overflow-y-auto p-4 text-sm leading-relaxed text-justify"
                    style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#d1d5db',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#6b21a8 rgba(255, 255, 255, 0.05)'
                    }}
                >
                    <style>{`
                        .terms-scroll::-webkit-scrollbar { width: 8px; }
                        .terms-scroll::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 4px; }
                        .terms-scroll::-webkit-scrollbar-thumb { background: #6b21a8; border-radius: 4px; }
                        .terms-scroll::-webkit-scrollbar-thumb:hover { background: #7c3aed; }
                    `}</style>
                    <div className="terms-scroll">
                        <p>
                            To use <span className="text-pink-400 font-semibold">ZetsuservBlog&zersuchallangeHub</span>, you must agree to these terms.
                            This application is intended for entertainment and productive purposes only.
                            Please read the following terms carefully.
                        </p>
                        <br />
                        <p>
                            <strong className="text-white">1. Virtual Currency:</strong> All virtual coins (ZCoins, ZGold), tokens, or credits used within the
                            ZetsuservBlog application hold no real-world value. They cannot be exchanged for real money,
                            goods, or services outside of the application ecosystem.
                        </p>
                        <br />
                        <p>
                            <strong className="text-white">2. AI Verification:</strong> Our system utilizes artificial intelligence for verification
                            and content generation. While we strive for accuracy, AI verification may not always be 100% accurate.
                            We are not liable for errors made by the AI systems.
                        </p>
                        <br />
                        <p>
                            <strong className="text-white">3. User Conduct:</strong> You agree to use the application in a manner that does not infringe
                            upon the rights of others. Any form of harassment, abuse, or exploitation of bugs will result in
                            an immediate ban.
                        </p>
                        <br />
                        <p>
                            <strong className="text-white">4. Privacy Policy:</strong> Your data is important to us. By accepting these terms,
                            you also consent to our data collection practices as outlined in our Privacy Policy.
                        </p>
                        <br />
                        <p>
                            <strong className="text-white">5. Zersu's Arena:</strong> Participation in Zersu's challenges is voluntary.
                            All rewards and penalties are virtual and for entertainment purposes only.
                        </p>
                        <br />
                        <p>
                            <strong className="text-white">6. Disclaimer of Warranties:</strong> The service is provided "AS IS". We do not guarantee
                            uninterrupted access or error-free operation. Use at your own risk.
                        </p>
                        <br />
                        <p>
                            <strong className="text-white">7. Modifications:</strong> ZetsuservBlog reserves the right to modify these terms at any time.
                            Continued use of the application constitutes acceptance of any new terms.
                        </p>
                        <br />
                        <p className="text-purple-400 font-medium">
                            Thank you for reading. Please scroll to the bottom to enable the agreement checkbox.
                        </p>
                        <br />
                        <p className="text-gray-500 text-xs">
                            By accepting these terms, you acknowledge that you have read, understood, and agree to be bound by all the terms and conditions stated above.
                            If you do not agree with any part of these terms, you must not use this application.
                        </p>
                    </div>
                </div>

                {/* Actions Area */}
                <div className="flex flex-col gap-4 mt-2">
                    {/* Checkbox */}
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={isAgreed}
                            onChange={handleCheckboxChange}
                            className="appearance-none w-5 h-5 border-2 border-purple-800 rounded cursor-pointer relative transition-all duration-200 checked:bg-purple-500 checked:shadow-[0_0_10px_rgba(168,85,247,0.6)]"
                            style={{
                                background: isAgreed ? '#a855f7' : 'transparent'
                            }}
                        />
                        <span className="text-sm text-slate-200">
                            I agree to the Terms of Service
                        </span>
                        {isAgreed && (
                            <span className="absolute left-[0.35rem] text-white text-xs">✓</span>
                        )}
                    </label>

                    {/* Scroll hint message */}
                    <div
                        className={`text-red-400 text-xs text-center min-h-[1.2em] transition-opacity duration-300 ${showScrollError ? 'opacity-100' : 'opacity-0'}`}
                    >
                        Please scroll to the bottom first.
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={handleAccept}
                            disabled={!hasScrolled || !isAgreed}
                            className="flex-1 py-3 rounded-lg font-semibold uppercase tracking-wider transition-all duration-300 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
                            style={{
                                background: (!hasScrolled || !isAgreed) ? '#4b5563' : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                                color: (!hasScrolled || !isAgreed) ? '#9ca3af' : 'white',
                                boxShadow: (!hasScrolled || !isAgreed) ? 'none' : '0 4px 15px rgba(124, 58, 237, 0.4)'
                            }}
                            onMouseEnter={(e) => {
                                if (hasScrolled && isAgreed) {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(124, 58, 237, 0.6)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                if (hasScrolled && isAgreed) {
                                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(124, 58, 237, 0.4)';
                                }
                            }}
                        >
                            Accept
                        </button>
                        <button
                            onClick={handleReject}
                            className="flex-1 py-3 rounded-lg font-semibold uppercase tracking-wider transition-all duration-300 bg-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                            style={{
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            }}
                        >
                            NEVER!!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper function to check if terms have been accepted
export const hasAcceptedTerms = (): boolean => {
    return localStorage.getItem('zetsu_terms_accepted') === 'true';
};

export default TermsOfService;
