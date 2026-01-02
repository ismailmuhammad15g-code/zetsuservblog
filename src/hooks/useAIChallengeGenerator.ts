import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const API_KEY = 'sk-8s5lZUboc3EDTzMjTNP6y2Vp3I6sAVKcdexeJtVUs4fVwGGZ9BvGTTSgBOw';
const API_URL = 'https://api.routeway.ai/v1/chat/completions';

export interface GeneratedChallenge {
    title: string;
    title_ar: string;
    description: string;
    description_ar: string;
    cost: number;
    reward: number;
    failure_penalty: number;
    difficulty: 'easy' | 'medium' | 'hard';
    verification_type: string;
    time_limit: string;
    icon: string;
}

const ICONS = ['target', 'zap', 'flame', 'shield', 'trending-up', 'trophy'];

export const useAIChallengeGenerator = () => {
    const [isGenerating, setIsGenerating] = useState(false);

    const generateChallenges = async (userId: string): Promise<GeneratedChallenge[]> => {
        setIsGenerating(true);

        try {
            const prompt = `أنت مولد تحديات لعبة ZERSU. مطلوب منك إنشاء 5 تحديات فريدة ومختلفة لمنصة التدوين.

القواعد:
1. التحديات يجب أن تكون متعلقة بالتدوين والمحتوى والتفاعل الاجتماعي
2. يجب أن تكون التحديات قابلة للتحقق (مثل: انشر منشور، احصل على تعليقات، شارك على وسائل التواصل)
3. التوزيع: 2 سهل، 2 متوسط، 1 صعب
4. التكلفة: سهل (1-2)، متوسط (2-3)، صعب (4-5)
5. المكافأة: سهل (3-5)، متوسط (6-10)، صعب (15-25)
6. العقوبة: سهل (1-2)، متوسط (3-4)، صعب (5-8)
7. الوقت: سهل (24h)، متوسط (48h)، صعب (72h أو 7d)
8. كن إبداعياً! لا تكرر تحديات مملة

أمثلة جيدة:
- "اكتب منشوراً يحصل على 5 إعجابات"
- "علق على 10 منشورات مختلفة"
- "اكتب منشوراً باللغة الإنجليزية"
- "احصل على متابع جديد"
- "شارك منشورك على تويتر"

أجب بـ JSON فقط (بدون markdown):
[
  {
    "title": "CHALLENGE NAME IN ENGLISH",
    "title_ar": "اسم التحدي بالعربية",
    "description": "Challenge description in English",
    "description_ar": "وصف التحدي بالعربية",
    "cost": 1,
    "reward": 5,
    "failure_penalty": 2,
    "difficulty": "easy",
    "time_limit": "24h",
    "icon": "target"
  }
]

الأيقونات المتاحة: target, zap, flame, shield, trending-up, trophy`;

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: 'kimi-k2-0905:free',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.9,
                    max_tokens: 3000
                })
            });

            if (!response.ok) {
                console.error('AI API error:', await response.text());
                throw new Error('Failed to generate challenges');
            }

            const data = await response.json();
            const textResponse = data.choices?.[0]?.message?.content || '';
            console.log('AI Response:', textResponse);

            // Parse JSON from response
            const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('Invalid AI response format');
            }

            const challenges: GeneratedChallenge[] = JSON.parse(jsonMatch[0]);

            // Validate and fix challenges
            const validatedChallenges = challenges.slice(0, 5).map((c, i) => ({
                title: c.title || `Challenge ${i + 1}`,
                title_ar: c.title_ar || `التحدي ${i + 1}`,
                description: c.description || 'Complete this challenge!',
                description_ar: c.description_ar || 'أكمل هذا التحدي!',
                cost: Math.max(1, Math.min(5, c.cost || 1)),
                reward: Math.max(3, Math.min(25, c.reward || 5)),
                failure_penalty: Math.max(1, Math.min(8, c.failure_penalty || 2)),
                difficulty: (['easy', 'medium', 'hard'].includes(c.difficulty) ? c.difficulty : 'easy') as 'easy' | 'medium' | 'hard',
                verification_type: 'ai_verification',
                time_limit: c.time_limit || '24h',
                icon: ICONS.includes(c.icon) ? c.icon : ICONS[i % ICONS.length]
            }));

            // Save to database
            const challengesToInsert = validatedChallenges.map(c => ({
                user_id: userId,
                ...c
            }));

            const { error: insertError } = await supabase
                .from('user_challenges')
                .insert(challengesToInsert);

            if (insertError) {
                console.error('Error inserting challenges:', insertError);
                throw new Error('Failed to save challenges');
            }

            // Update game_profiles to mark challenges as generated
            const { error: updateError } = await supabase
                .from('game_profiles')
                .update({ challenges_generated: true })
                .eq('user_id', userId);

            if (updateError) {
                console.error('Error updating profile:', updateError);
            }

            return validatedChallenges;

        } catch (error) {
            console.error('Challenge generation error:', error);
            toast.error('فشل في توليد التحديات، جاري المحاولة مرة أخرى...');

            // Return fallback challenges if AI fails
            return getFallbackChallenges();
        } finally {
            setIsGenerating(false);
        }
    };

    // Generate a single replacement challenge when one is completed
    const generateSingleChallenge = async (userId: string, completedChallengeId: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<GeneratedChallenge | null> => {
        try {
            // First, mark the old challenge as inactive
            await supabase
                .from('user_challenges')
                .update({ is_active: false })
                .eq('id', completedChallengeId);

            const difficultyAr = difficulty === 'easy' ? 'سهل' : difficulty === 'medium' ? 'متوسط' : 'صعب';

            const prompt = `أنت مولد تحديات لعبة ZERSU. أنشئ تحدياً واحداً فقط بصعوبة "${difficultyAr}".

القواعد:
- التحدي يجب أن يكون متعلق بالتدوين والمحتوى
- الصعوبة: ${difficultyAr}
- التكلفة: ${difficulty === 'easy' ? '1-2' : difficulty === 'medium' ? '2-3' : '4-5'}
- المكافأة: ${difficulty === 'easy' ? '3-5' : difficulty === 'medium' ? '6-10' : '15-25'}
- العقوبة: ${difficulty === 'easy' ? '1-2' : difficulty === 'medium' ? '3-4' : '5-8'}
- الوقت: ${difficulty === 'easy' ? '24h' : difficulty === 'medium' ? '48h' : '72h'}
- كن إبداعياً! تحدي جديد ومختلف

أمثلة: انشر منشور، احصل على إعجابات، علق على منشورات، شارك على تواصل اجتماعي

أجب بـ JSON فقط (بدون markdown):
{
  "title": "CHALLENGE NAME",
  "title_ar": "اسم التحدي",
  "description": "Description",
  "description_ar": "الوصف",
  "cost": 1,
  "reward": 5,
  "failure_penalty": 2,
  "difficulty": "${difficulty}",
  "time_limit": "24h",
  "icon": "target"
}

الأيقونات: target, zap, flame, shield, trending-up, trophy`;

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: 'kimi-k2-0905:free',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.9,
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                console.error('AI API error:', await response.text());
                return getRandomFallbackChallenge(difficulty);
            }

            const data = await response.json();
            const textResponse = data.choices?.[0]?.message?.content || '';

            // Parse JSON from response
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return getRandomFallbackChallenge(difficulty);
            }

            const c = JSON.parse(jsonMatch[0]);

            const newChallenge: GeneratedChallenge = {
                title: c.title || `Challenge`,
                title_ar: c.title_ar || `تحدي جديد`,
                description: c.description || 'Complete this challenge!',
                description_ar: c.description_ar || 'أكمل هذا التحدي!',
                cost: Math.max(1, Math.min(5, c.cost || 1)),
                reward: Math.max(3, Math.min(25, c.reward || 5)),
                failure_penalty: Math.max(1, Math.min(8, c.failure_penalty || 2)),
                difficulty: difficulty,
                verification_type: 'ai_verification',
                time_limit: c.time_limit || '24h',
                icon: ICONS.includes(c.icon) ? c.icon : ICONS[Math.floor(Math.random() * ICONS.length)]
            };

            // Save new challenge to database
            const { error: insertError } = await supabase
                .from('user_challenges')
                .insert({
                    user_id: userId,
                    ...newChallenge
                });

            if (insertError) {
                console.error('Error inserting replacement challenge:', insertError);
                return null;
            }

            toast.success('تم إنشاء تحدي جديد! 🎮');
            return newChallenge;

        } catch (error) {
            console.error('Single challenge generation error:', error);
            return getRandomFallbackChallenge(difficulty);
        }
    };

    // Get a random fallback challenge for a specific difficulty
    const getRandomFallbackChallenge = (difficulty: 'easy' | 'medium' | 'hard'): GeneratedChallenge => {
        const fallbacks = getFallbackChallenges().filter(c => c.difficulty === difficulty);
        if (fallbacks.length === 0) return getFallbackChallenges()[0];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    };

    const getFallbackChallenges = (): GeneratedChallenge[] => [
        {
            title: 'FIRST POST',
            title_ar: 'المنشور الأول',
            description: 'Publish your first blog post on the platform!',
            description_ar: 'انشر أول منشور لك على المنصة!',
            cost: 1,
            reward: 5,
            failure_penalty: 2,
            difficulty: 'easy',
            verification_type: 'ai_verification',
            time_limit: '24h',
            icon: 'target'
        },
        {
            title: 'SOCIAL SHARE',
            title_ar: 'المشاركة الاجتماعية',
            description: 'Share your post on social media!',
            description_ar: 'شارك منشورك على وسائل التواصل!',
            cost: 1,
            reward: 4,
            failure_penalty: 1,
            difficulty: 'easy',
            verification_type: 'ai_verification',
            time_limit: '24h',
            icon: 'zap'
        },
        {
            title: 'ENGAGEMENT HUNTER',
            title_ar: 'صياد التفاعل',
            description: 'Get 5 likes on your post!',
            description_ar: 'احصل على 5 إعجابات على منشورك!',
            cost: 2,
            reward: 8,
            failure_penalty: 3,
            difficulty: 'medium',
            verification_type: 'ai_verification',
            time_limit: '48h',
            icon: 'flame'
        },
        {
            title: 'COMMUNITY MEMBER',
            title_ar: 'عضو المجتمع',
            description: 'Comment on 10 different posts!',
            description_ar: 'علق على 10 منشورات مختلفة!',
            cost: 3,
            reward: 10,
            failure_penalty: 4,
            difficulty: 'medium',
            verification_type: 'ai_verification',
            time_limit: '48h',
            icon: 'shield'
        },
        {
            title: 'VIRAL CONTENT',
            title_ar: 'المحتوى الفيروسي',
            description: 'Get 50 views on a single post!',
            description_ar: 'احصل على 50 مشاهدة لمنشور واحد!',
            cost: 4,
            reward: 20,
            failure_penalty: 6,
            difficulty: 'hard',
            verification_type: 'ai_verification',
            time_limit: '72h',
            icon: 'trending-up'
        }
    ];

    return { generateChallenges, generateSingleChallenge, isGenerating, getFallbackChallenges };
};

export default useAIChallengeGenerator;
