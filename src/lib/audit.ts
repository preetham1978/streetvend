import { supabase } from './supabase';

export async function logAdminAction(adminId: string, action: string, details?: any) {
    if (!supabase) return;
    
    try {
        const { error } = await (supabase as any).from('admin_audit_log').insert([{
            admin_user_id: adminId,
            action: action,
            details: details,
            timestamp: new Date().toISOString()
        }]);
        
        if (error) {
            console.error('Error logging admin action:', error);
        }
    } catch (err) {
        console.error('Audit log exception:', err);
    }
}
