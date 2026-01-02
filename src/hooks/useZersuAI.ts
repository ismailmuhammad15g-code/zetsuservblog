import { useState } from 'react';
import Bytez from 'bytez.js';

// ============================================
// API KEYS WITH FALLBACK SYSTEM
// ============================================

// Routeway (Kimi-K2) API Keys - Fallback Pool
const ROUTEWAY_API_KEYS = [
    'sk-8s5lZUboc3EDTzMjTNP6y2Vp3I6sAVKcdexeJtVUs4fVwGGZ9BvGTTSgBOw',
    'sk-FAHTfp476ZZ8Eg5UkvTXfmjif7wwUZtAYueRrhVgUEQ4Sh1-FI6HMqoDJAvdS6oumro9sZg',
    'sk-TybF3uEzGuQ1w_M0bRG29Poc7NP_XG9M2pK3NgoCL_naYmsTUI3ZxJC1X9PqZJ9fdvfIhQvJmfGHNw',
    'sk-dTE-QiF3uch6het-hGMzBvhYJBSQC1kYMwh8LYKZigrbg5Zq2TzlKUQrxOyjss2Wj1iBFkI',
    'sk-vYHw7FUGio4FAV_KViXTPvXZ1CEDSR0RHOR4ZGtgvhBRUz7pYRwGEGMGxRAdA_1DNwX6U4StQHSgKWDiEjL2pXVx',
    'sk-l5VKkYVbRoXwTK9TAfv-ApwRX1_fYXPS9kPi3ssIHz9uw3A2K-90yPW4pPtMoO62WYCO_aT6Giu4Ug'
];
const ROUTEWAY_API_URL = 'https://api.routeway.ai/v1/chat/completions';

// Bytez (BLIP Long Cap) API Keys - Fallback Pool
const BYTEZ_API_KEYS = [
    'a4a36ed8f24ee03d5ffa4bdfb598c0ad',
    'cb190ed716c8aa633b1d727870ba408a',
    '1779459e2927b2ac9b39ffb54af50391',
    '8494473e0ef86060ed229ca0b85f1e5d',
    '76f9b697a665f089705da8a6b1437014',
    '357b653d8ff041acc00ffae18c1c9161'
];

// Timeout configuration (in milliseconds)
const API_TIMEOUT_MS = 45000; // 45 seconds max per API call (increased for slow models)
const RETRY_DELAY_MS = 1500;  // 1.5 seconds between retries

// Track which key index to start with (round-robin for load balancing)
let currentBytezKeyIndex = 0;
let currentRoutewayKeyIndex = 0;

export interface VerificationResult {
    success: boolean;
    confidence: number;
    feedback: string;
    feedbackAr: string;
    zersuMood: 'angry' | 'happy' | 'sad' | 'mocking';
    error?: boolean;
}

export interface EnhancedChallenge {
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    cost: number;
    reward: number;
    difficulty: 'easy' | 'medium' | 'hard';
    mockery: string;
    mockeryAr: string;
    isValid: boolean;
}

export interface ChallengeVerification {
    challengeTitle: string;
    challengeDescription?: string;
    proofImage: string;
    userId: string;
    personality?: 'sarcastic' | 'polite';
}

// Zersu reactions for different outcomes
const ZERSU_REACTIONS = {
    success: {
        mood: 'sad' as const,
        messages: [
            { en: "Impossible! You actually did it... 😤", ar: "مستحيل! لقد فعلتها فعلاً... 😤" },
            { en: "Fine, you win THIS time... 😒", ar: "حسناً، فزت هذه المرة... 😒" },
            { en: "I underestimated you, human... 😑", ar: "لقد استخففت بك أيها البشري... 😑" },
            { en: "You got lucky! Next time won't be so easy! 😠", ar: "كنت محظوظاً! المرة القادمة لن تكون سهلة! 😠" },
        ],
        politeMessages: [
            { en: "Amazing work! You did it! 🎉", ar: "عمل مذهل! لقد فعلتها! 🎉" },
            { en: "Great job! Keep it up! 🌟", ar: "أحسنت! استمر على هذا المنوال! 🌟" },
            { en: "You are getting stronger! 💪", ar: "أنت تزداد قوة! 💪" },
        ]
    },
    failure: {
        mood: 'mocking' as const,
        messages: [
            { en: "HAHAHA! I knew you'd fail! 😈", ar: "هاهاها! كنت أعلم أنك ستفشل! 😈" },
            { en: "Pathetic! Is that the best you can do? 🤣", ar: "مثير للشفقة! هل هذا أفضل ما لديك؟ 🤣" },
            { en: "Did you really think THAT would work? 😂", ar: "هل اعتقدت حقاً أن ذلك سينجح؟ 😂" },
            { en: "WEAK! Try again, loser! 👎", ar: "ضعيف! حاول مرة أخرى أيها الخاسر! 👎" },
        ],
        politeMessages: [
            { en: "Don't give up! try again! 💪", ar: "لا تستسلم! حاول مرة أخرى! 💪" },
            { en: "It was close! You can do it next time. 😊", ar: "كنت قريباً! يمكنك فعلها في المرة القادمة. 😊" },
            { en: "Failure is just a step towards success. 🌱", ar: "الفشل مجرد خطوة نحو النجاح. 🌱" },
        ]
    },
    cheating: {
        mood: 'angry' as const,
        messages: [
            { en: "CHEATER! Did you think I wouldn't notice?! 🔥", ar: "غشاش! هل ظننت أنني لن ألاحظ؟! 🔥" },
            { en: "Nice try, but I can see through your tricks! 👁️", ar: "محاولة جيدة، لكنني أرى خدعك! 👁️" },
            { en: "FAKE! You dare try to deceive ZERSU?! ⚡", ar: "مزيف! تجرؤ على خداع ZERSU؟! ⚡" },
        ],
        politeMessages: [
            { en: "Please be honest. 🛑", ar: "أرجوك كن صادقاً. 🛑" },
            { en: "That doesn't look right. Please try fairly. ⚠️", ar: "هذا لا يبدو صحيحاً. يرجى المحاولة بنزاهة. ⚠️" },
        ]
    },
    error: {
        mood: 'angry' as const,
        messages: [
            { en: "Something went wrong... Contact the admin!", ar: "حدث خطأ... تواصل مع مدير الموقع!" },
        ],
        politeMessages: [
            { en: "An error occurred. Please try again.", ar: "حدث خطأ ما. يرجى المحاولة مرة أخرى." },
        ]
    }
};


// Helper: Call Routeway API with Kimi-K2-0905:free model
async function callKimiWithFallback(prompt: string) {
    let lastError;
    for (let i = 0; i < ROUTEWAY_API_KEYS.length; i++) {
        const keyIndex = (currentRoutewayKeyIndex + i) % ROUTEWAY_API_KEYS.length;
        const apiKey = ROUTEWAY_API_KEYS[keyIndex];

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

            const response = await fetch(ROUTEWAY_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'kimi-k2-0905:free',
                    messages: [{ role: 'user', content: prompt }]
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 401 || response.status === 429) {
                    console.warn(`Routeway Key ${keyIndex} failed (${response.status}). Trying next...`);
                    continue;
                }
                throw new Error(`Routeway API error: ${response.status}`);
            }

            const data = await response.json();
            currentRoutewayKeyIndex = (keyIndex + 1) % ROUTEWAY_API_KEYS.length;

            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error("Invalid response format from Routeway");
            }
            return data.choices[0].message.content;

        } catch (err: any) {
            lastError = err;
            if (err.name !== 'AbortError') {
                console.warn(`Kimi attempt ${i + 1} failed:`, err.message);
            }
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        }
    }
    throw lastError || new Error("All Routeway keys failed");
}

// Helper: Wrapper for GPT-style calls (uses Kimi)
async function callGPT35WithFallback(prompt: string) {
    return callKimiWithFallback(prompt);
}

// Legacy alias for backward compatibility
async function callRoutewayWithFallback(prompt: string, _model: string = 'kimi-k2-0905:free') {
    return callKimiWithFallback(prompt);
}

// Helper: Call Bytez for Image Captioning
async function callBytezWithFallback(imageBase64: string) {
    let lastError;
    // Remove header if present for Bytez raw input? Or keep it?
    // Usually Bytez client handles base64.

    for (let i = 0; i < BYTEZ_API_KEYS.length; i++) {
        const keyIndex = (currentBytezKeyIndex + i) % BYTEZ_API_KEYS.length;
        const apiKey = BYTEZ_API_KEYS[keyIndex];

        try {
            const client = new Bytez(apiKey);
            const model = client.model("Salesforce/blip-image-captioning-large");

            // Race with timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Bytez timeout")), API_TIMEOUT_MS)
            );

            const runPromise = model.run(imageBase64);

            const result: any = await Promise.race([runPromise, timeoutPromise]);

            currentBytezKeyIndex = (keyIndex + 1) % BYTEZ_API_KEYS.length;

            if (result && result.output) return result.output;
            if (typeof result === 'string') return result;

            throw new Error("Invalid response from Bytez");

        } catch (err: any) {
            lastError = err;
            console.warn(`Bytez attempt ${i + 1} failed:`, err.message);
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        }
    }
    throw lastError || new Error("All Bytez keys failed");
}


// ============================================
// MAIN HOOK
// ============================================
export const useZersuAI = () => {
    const [isVerifying, setIsVerifying] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);

    const getRandomReaction = (type: keyof typeof ZERSU_REACTIONS, personality: 'sarcastic' | 'polite' = 'sarcastic') => {
        const category = ZERSU_REACTIONS[type];
        const messages = (personality === 'polite' && 'politeMessages' in category)
            ? (category as any).politeMessages
            : category.messages;

        return messages[Math.floor(Math.random() * messages.length)];
    };

    const enhanceChallenge = async (userTitle: string, userDescription: string): Promise<EnhancedChallenge> => {
        // ... (enhance stays mostly same, but mockery could be adjusted if we passed personality here too, but user only asked for response/voice mainly. Let's keep enhance strictly sarcastic as that's the "character" unless specified otherwise, but Zersu IS the character.)
        // For now, leaving enhance as is.
        setIsEnhancing(true);
        console.log('🧠 Zersu AI Enhancing Challenge:', { userTitle, userDescription });

        try {
            const prompt = `You are Zersu, the evil, sarcastic, but fair anime game master.
A user has proposed a custom challenge. You must analyze it.

USER PROPOSAL:
Title: "${userTitle}"
Description: "${userDescription}"

YOUR TASK:
1. FIRST CHECK: Is this a REAL challenge or NONSENSE?
   - If the input is gibberish (e.g., "1111", "asdf", "xxx", random letters/numbers, emojis only, or meaningless text), you MUST REJECT IT.
   - Set isValid to FALSE and mock them harshly for wasting your time.
   
2. If the challenge is too easy (e.g., "drink water", "blink"), you mock them and MAKE IT HARDER (e.g., "Drink water while doing a handstand", "Don't blink for 2 minutes").

3. If the challenge is invalid or cheating (e.g., "give me free coins", "do nothing"), REJECT IT (isValid: false).

4. If it's a good challenge, accept it but maybe make the description more epic/dramatic.

5. Assign appropriate Cost (to enter), Reward (for winning), and Difficulty.
   - LOGIC FOR COST:
     - If the task is HARD/EPIC -> It should be CHEAP to enter (1-2 ZCoins) to encourage trying.
     - If the task is EASY -> It should be EXPENSIVE to enter (3-7 ZCoins) to prevent spamming easy wins.
   - Reward should scale with difficulty as usual.

OUTPUT FORMAT (JSON ONLY - no markdown, no explanation):
{
    "title": "Improved Title (English)",
    "titleAr": "العنوان المحسن (Arabic)",
    "description": "Improved Description (English)",
    "descriptionAr": "الوصف المحسن (Arabic)",
    "cost": 5,
    "reward": 15,
    "difficulty": "medium",
    "mockery": "Sarcastic comment (English)",
    "mockeryAr": "تعليق ساخر (Arabic)",
    "isValid": true
}

IMPORTANT: If isValid is false, still provide a mockery explaining WHY you're rejecting it.
`;

            // Try GPT-3.5 first (faster, more reliable)
            let textResponse = '';
            try {
                console.log('🚀 Trying GPT-3.5-turbo (Primary)...');
                textResponse = await callGPT35WithFallback(prompt);
            } catch (gptError: any) {
                console.warn('⚠️ GPT-3.5 failed, falling back to Kimi...', gptError.message);
                textResponse = await callRoutewayWithFallback(prompt);
            }
            console.log('✅ Enhancement Response:', textResponse);

            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    title: parsed.title,
                    titleAr: parsed.titleAr,
                    description: parsed.description,
                    descriptionAr: parsed.descriptionAr,
                    cost: parsed.cost || 5,
                    reward: parsed.reward || 10,
                    difficulty: parsed.difficulty || 'medium',
                    mockery: parsed.mockery || "Hmph, acceptable.",
                    mockeryAr: parsed.mockeryAr || "همم، مقبول.",
                    isValid: parsed.isValid
                };
            }

            throw new Error("Failed to parse AI response");

        } catch (error) {
            console.error('Enhancement error:', error);
            // Fallback for error
            return {
                title: userTitle,
                titleAr: userTitle,
                description: userDescription,
                descriptionAr: userDescription,
                cost: 5,
                reward: 10,
                difficulty: 'medium',
                mockery: "AI is offline, so I'll let this slide... for now.",
                mockeryAr: "الذكاء الاصطناعي متوقف، سأسمح بهذا... للآن.",
                isValid: true
            };
        } finally {
            setIsEnhancing(false);
        }
    };

    const verifyChallenge = async ({
        challengeTitle,
        challengeDescription = '',
        proofImage,
        userId,
        personality = 'sarcastic'
    }: ChallengeVerification): Promise<VerificationResult> => {
        setIsVerifying(true);

        try {
            // ============================================
            // STEP 0: Prepare Image
            // ============================================
            let imageBase64 = '';
            if (proofImage.startsWith('blob:') || proofImage.startsWith('data:')) {
                try {
                    const response = await fetch(proofImage);
                    const blob = await response.blob();
                    imageBase64 = await blobToBase64(blob);
                } catch (e) {
                    console.error('Error converting image:', e);
                    const reaction = getRandomReaction('error', personality);
                    return {
                        success: false,
                        confidence: 0,
                        feedback: reaction.en,
                        feedbackAr: reaction.ar,
                        zersuMood: 'angry',
                        error: true
                    };
                }
            }

            if (!imageBase64) {
                console.warn('No image provided for verification!');
                return {
                    success: false,
                    confidence: 0,
                    feedback: 'No image provided',
                    feedbackAr: 'لم يتم توفير صورة',
                    zersuMood: 'angry',
                    error: true
                };
            }

            // Compress large images
            let processedImage = imageBase64;
            if (imageBase64 && imageBase64.length > 200000) {
                console.log('Compressing large image for faster processing...');
                processedImage = await compressImage(imageBase64, 0.7, 1000);
            }

            // ============================================
            // STEP 1: Get Image Description from Bytez (with Fallback)
            // ============================================
            console.log('📸 STEP 1: Calling Bytez (BLIP Long Cap) with Fallback...');

            let imageDescription = '';
            try {
                imageDescription = await callBytezWithFallback(processedImage);
                console.log('✅ Image Description:', imageDescription);
            } catch (err: any) {
                console.error('❌ All Bytez keys failed:', err.message);
                return {
                    success: false,
                    confidence: 0,
                    feedback: 'Image analysis service unavailable. Please try again later.',
                    feedbackAr: 'خدمة تحليل الصور غير متوفرة حالياً. حاول لاحقاً.',
                    zersuMood: 'angry',
                    error: true
                };
            }

            if (!imageDescription || imageDescription.length < 5) {
                console.error("Empty or invalid description from Bytez");
                return {
                    success: false,
                    confidence: 0,
                    feedback: 'Could not analyze image content.',
                    feedbackAr: 'فشل في تحليل محتوى الصورة.',
                    zersuMood: 'angry',
                    error: true
                };
            }

            // ============================================
            // STEP 2: Verify Logic with Routeway Kimi-K2 (with Fallback)
            // ============================================
            console.log('🧠 STEP 2: Verifying Logic with Kimi-K2 (Fallback)...');

            const logicPrompt = `You are Zersu, a sarcastic and strict anime villain game judge.
CHALLENGE: "${challengeTitle}"
DESCRIPTION: "${challengeDescription || 'Verify this challenge'}"

IMAGE SHOWS: "${imageDescription}"

TASK: Does the image description prove the challenge was completed?

RULES:
- If image shows what is asked = success: true
- If image is unrelated/wrong = success: false
- Be strict but fair.

Respond with JSON ONLY:
{
    "success": true, 
    "confidence": 85, 
    "isCheating": false, 
    "feedback": "Reason for decision (keep it short)", 
    "feedbackAr": "Reason in Arabic (keep it short)"
}
`;

            let textResponse = '';
            try {
                textResponse = await callRoutewayWithFallback(logicPrompt);
                console.log('✅ Logic Response:', textResponse);
            } catch (err: any) {
                console.error('❌ All Routeway keys failed:', err.message);
                return {
                    success: false,
                    confidence: 0,
                    feedback: 'Verification service unavailable. Please try again later.',
                    feedbackAr: 'خدمة التحقق غير متوفرة حالياً. حاول لاحقاً.',
                    zersuMood: 'sad',
                    error: true
                };
            }

            // Parse JSON from response
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                // Determine Zersu's mood based on result
                let mood: 'angry' | 'happy' | 'sad' | 'mocking' = 'mocking';
                let reaction;

                if (parsed.isCheating) {
                    mood = 'angry';
                    reaction = getRandomReaction('cheating', personality);
                } else if (parsed.success) {
                    mood = personality === 'polite' ? 'happy' : 'sad'; // Happy when polite and focused on user success, Sad when sarcastic (because user won)
                    reaction = getRandomReaction('success', personality);
                } else {
                    mood = personality === 'polite' ? 'sad' : 'mocking'; // Sad/encouraging when polite, Mocking when sarcastic
                    reaction = getRandomReaction('failure', personality);
                }

                return {
                    success: Boolean(parsed.success) && !parsed.isCheating,
                    confidence: Number(parsed.confidence) || 75,
                    feedback: parsed.feedback || reaction.en,
                    feedbackAr: parsed.feedbackAr || parsed.feedback || reaction.ar,
                    zersuMood: mood,
                    error: false
                };
            }

            const reaction = getRandomReaction('error', personality);
            return {
                success: false,
                confidence: 0,
                feedback: reaction.en,
                feedbackAr: reaction.ar,
                zersuMood: 'angry',
                error: true
            };

        } catch (error) {
            console.error('Verification error:', error);
            const reaction = getRandomReaction('error', personality);
            return {
                success: false,
                confidence: 0,
                feedback: reaction.en,
                feedbackAr: reaction.ar,
                zersuMood: 'angry',
                error: true
            };
        } finally {
            setIsVerifying(false);
        }
    };

    return { verifyChallenge, enhanceChallenge, isVerifying, isEnhancing };
};

// ============================================
// HELPER FUNCTIONS
// ============================================

async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function compressImage(base64: string, quality: number = 0.7, maxWidth: number = 1000): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            try {
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    resolve(base64);
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

                console.log(`Image compressed: ${(base64.length / 1024).toFixed(0)}KB -> ${(compressedBase64.length / 1024).toFixed(0)}KB`);
                resolve(compressedBase64);
            } catch (error) {
                console.error('Image compression failed:', error);
                resolve(base64);
            }
        };
        img.onerror = () => {
            console.error('Failed to load image for compression');
            resolve(base64);
        };
        img.src = base64;
    });
}

export default useZersuAI;
