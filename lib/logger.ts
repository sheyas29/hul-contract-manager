import { supabase } from '@/lib/supabase';

export async function logActivity(action: string, details: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Fire and forget - don't await this to avoid slowing down the app
    supabase.from('activity_logs').insert({
      user_id: user.id,
      user_email: user.email,
      action: action,
      details: details,
      created_at: new Date().toISOString()
    }).then(({ error }) => {
      if (error) console.error('Log Error:', error);
    });

  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
