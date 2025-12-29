import { supabase } from "@/integrations/supabase/client";

interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  user_id?: string;
  user_ids?: string[];
}

export async function sendPushNotification(payload: PushNotificationPayload) {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: payload,
    });

    if (error) {
      console.error('[Push] Error sending notification:', error);
      return { success: false, error };
    }

    console.log('[Push] Notification sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[Push] Error:', error);
    return { success: false, error };
  }
}

export async function notifyAllUsersNewPost(post: {
  title: string;
  excerpt?: string | null;
  content: string;
  slug: string;
  id: string;
}) {
  return sendPushNotification({
    title: `📝 New Post: ${post.title}`,
    body: post.excerpt || post.content.substring(0, 100) + '...',
    url: `/post/${post.slug}`,
    tag: `new-post-${post.id}`,
  });
}
