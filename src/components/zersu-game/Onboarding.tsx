import React, { useState } from 'react';
import ZersuCharacter from './ZersuCharacter';

interface OnboardingProps {
    onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [phase, setPhase] = useState(0);

    const phases = [
        {
            mood: "challenge" as const,
            text: "SO... YOU THINK YOU CAN HANDLE ME?",
            buttons: ["I'M READY!"]
        },
        {
            mood: "laughing" as const,
            text: "HAHAHA! FOOLISH MORTAL! I'LL BREAK YOUR SPIRIT!",
            buttons: ["BRING IT ON!"]
        },
        {
            mood: "sad" as const, // Feigning sadness/innocence
            text: "JUST KIDDING... OR AM I? 😈",
            buttons: ["START CHALLENGES"]
        }
    ];

    const currentPhase = phases[phase];

    const handleNext = () => {
        if (phase < phases.length - 1) {
            setPhase(phase + 1);
        } else {
            onComplete();
        }
    };

    return (
        <div className="onboarding-container dark-background flex flex-col items-center justify-center h-full w-full absolute top-0 left-0 z-50">
            <div className="character-animation mb-8 animate-in fade-in zoom-in duration-500">
                <ZersuCharacter type="idle" size="large" />
                <div className="speech-bubble animate-in slide-in-from-bottom-5 duration-500">
                    {currentPhase.text}
                </div>
            </div>
            <div className="onboarding-controls z-10">
                {currentPhase.buttons.map((text, index) => (
                    <button
                        key={index}
                        onClick={handleNext}
                        className="game-button pulse-animation text-xl px-8 py-3 transform hover:scale-110 active:scale-95"
                    >
                        {text}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Onboarding;
