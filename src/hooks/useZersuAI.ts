import { useState } from 'react';

const GEMINI_API_KEY = 'AIzaSyApivEq8wgX1einK49rXq4PWs8RNPKxhNA';
// Use the stable Gemini 2.5 Flash model
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface VerificationResult {
    success: boolean;
    confidence: number;
    feedback: string;
    feedbackAr: string;
    zersuMood: 'angry' | 'happy' | 'sad' | 'mocking';
    error?: boolean;
}

interface ChallengeVerification {
    challengeTitle: string;
    challengeDescription?: string;
    proofImage: string;
    userId: string;
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
        ]
    },
    failure: {
        mood: 'mocking' as const,
        messages: [
            { en: "HAHAHA! I knew you'd fail! 😈", ar: "هاهاها! كنت أعلم أنك ستفشل! 😈" },
            { en: "Pathetic! Is that the best you can do? 🤣", ar: "مثير للشفقة! هل هذا أفضل ما لديك؟ 🤣" },
            { en: "Did you really think THAT would work? 😂", ar: "هل اعتقدت حقاً أن ذلك سينجح؟ 😂" },
            { en: "WEAK! Try again, loser! 👎", ar: "ضعيف! حاول مرة أخرى أيها الخاسر! 👎" },
        ]
    },
    cheating: {
        mood: 'angry' as const,
        messages: [
            { en: "CHEATER! Did you think I wouldn't notice?! 🔥", ar: "غشاش! هل ظننت أنني لن ألاحظ؟! 🔥" },
            { en: "Nice try, but I can see through your tricks! 👁️", ar: "محاولة جيدة، لكنني أرى خدعك! 👁️" },
            { en: "FAKE! You dare try to deceive ZERSU?! ⚡", ar: "مزيف! تجرؤ على خداع ZERSU؟! ⚡" },
        ]
    },
    error: {
        mood: 'angry' as const,
        messages: [
            { en: "Something went wrong... Contact the admin!", ar: "حدث خطأ... تواصل مع مدير الموقع!" },
        ]
    }
};

export const useZersuAI = () => {
    const [isVerifying, setIsVerifying] = useState(false);

    const getRandomReaction = (type: keyof typeof ZERSU_REACTIONS) => {
        const reactions = ZERSU_REACTIONS[type].messages;
        return reactions[Math.floor(Math.random() * reactions.length)];
    };

    const verifyChallenge = async ({
        challengeTitle,
        challengeDescription = '',
        proofImage,
        userId
    }: ChallengeVerification): Promise<VerificationResult> => {
        setIsVerifying(true);

        try {
            // Convert image URL to base64 if it's a blob URL
            let imageBase64 = '';
            if (proofImage.startsWith('blob:') || proofImage.startsWith('data:')) {
                try {
                    const response = await fetch(proofImage);
                    const blob = await response.blob();
                    imageBase64 = await blobToBase64(blob);
                } catch (e) {
                    console.error('Error converting image:', e);
                    // If image conversion fails, return error
                    const reaction = getRandomReaction('error');
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

            // Prepare the prompt for Gemini - Strict verification
            const prompt = `أنت Zersu، شخصية شريرة ذكية جداً في لعبة تتحقق من إنجاز التحديات.

التحدي: ${challengeTitle}
الوصف: ${challengeDescription || 'تحقق من الصورة'}

افحص الصورة وحدد: هل تثبت إكمال التحدي؟ كن صارماً.

أجب JSON فقط (بدون markdown):
{"success":true/false,"confidence":0-100,"isCheating":true/false,"feedbackAr":"جملة واحدة قصيرة"}

إذا نجح: كن حزيناً. إذا فشل: اسخر منه. إذا غش: اغضب.`;

            // Call Gemini API
            const requestBody: any = {
                contents: [{
                    parts: [
                        { text: prompt }
                    ]
                }],
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 2048,
                    response_mime_type: "application/json"
                }
            };

            // Add image if available
            if (imageBase64) {
                requestBody.contents[0].parts.push({
                    inline_data: {
                        mime_type: 'image/jpeg',
                        data: imageBase64.split(',')[1] || imageBase64
                    }
                });
            }

            console.log('Calling Gemini API...');
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Gemini API error:', errorText);

                // Return error state - DO NOT complete the challenge
                const reaction = getRandomReaction('error');
                return {
                    success: false,
                    confidence: 0,
                    feedback: reaction.en,
                    feedbackAr: reaction.ar,
                    zersuMood: 'angry',
                    error: true
                };
            }

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            console.log('Gemini response:', textResponse);

            // Parse JSON from response
            try {
                // Extract JSON from the response (handle markdown code blocks)
                const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);

                    // Determine Zersu's mood based on result
                    let mood: 'angry' | 'happy' | 'sad' | 'mocking' = 'mocking';
                    let reaction;

                    if (parsed.isCheating) {
                        mood = 'angry';
                        reaction = getRandomReaction('cheating');
                    } else if (parsed.success) {
                        mood = 'sad';
                        reaction = getRandomReaction('success');
                    } else {
                        mood = 'mocking';
                        reaction = getRandomReaction('failure');
                    }

                    return {
                        success: Boolean(parsed.success) && !parsed.isCheating,
                        confidence: Number(parsed.confidence) || 75,
                        feedback: parsed.feedback || reaction.en,
                        feedbackAr: parsed.feedbackAr || reaction.ar,
                        zersuMood: mood,
                        error: false
                    };
                }
            } catch (parseError) {
                console.error('Error parsing Gemini response:', parseError);
            }

            // If we couldn't parse the response, return error
            const reaction = getRandomReaction('error');
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

            // Return error state - DO NOT randomly pass/fail
            const reaction = getRandomReaction('error');
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

    return { verifyChallenge, isVerifying };
};

// Helper function to convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export default useZersuAI;
