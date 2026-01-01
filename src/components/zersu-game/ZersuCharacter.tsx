import React from 'react';

type Mood = 'normal' | 'happy' | 'sad' | 'angry' | 'laughing' | 'challenge';

interface ZersuCharacterProps {
    mood?: Mood;
    className?: string;
    size?: 'small' | 'medium' | 'large';
}

const ZersuCharacter: React.FC<ZersuCharacterProps> = ({ mood = 'normal', className = '', size = 'medium' }) => {

    let src = "https://i.ibb.co/5gMzf6XK/zersu-challengeface.png"; // Default challenge face

    switch (mood) {
        case 'sad':
        case 'angry': // Using sad face for failure/angry for now
            src = "https://i.ibb.co/Fk26rzFX/zersu-sad.png";
            break;
        case 'laughing':
        case 'happy': // Using laugh for victory/happy
            src = "https://i.ibb.co/rGMR1Q98/zersu-villhaha.png";
            break;
        case 'challenge':
        case 'normal':
        default:
            src = "https://i.ibb.co/5gMzf6XK/zersu-challengeface.png";
            break;
    }

    const sizeClass = size === 'small' ? 'w-24' : size === 'large' ? 'w-80' : 'w-48';

    return (
        <div className={`character-container ${className} ${sizeClass}`}>
            <img
                src={src}
                alt={`Zersu ${mood}`}
                className="object-contain w-full h-full drop-shadow-2xl hover:scale-105 transition-transform duration-300"
            />
        </div>
    );
};

export default ZersuCharacter;
