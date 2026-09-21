import { supabase } from './supabase';

export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const sessionId = localStorage.getItem('device_session_id');
    
    // Attempt to get vendorId safely
    let vendorId = '';
    try { 
      const userStr = localStorage.getItem('vendor_user');
      if (userStr) {
        vendorId = JSON.parse(userStr).id;
      } else if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) vendorId = session.user.id;
      }
    } catch(e) {}

    if (sessionId && vendorId && typeof input === 'string' && input.startsWith('/api/')) {
        init = init || {};
        init.headers = {
            ...init.headers,
            'x-device-session-id': sessionId,
            'x-vendor-id': vendorId
        };
    }

    if (supabase && typeof input === 'string' && input.startsWith('/api/')) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                init = init || {};
                const headersObj = new Headers(init.headers || {});
                if (!headersObj.has('Authorization')) {
                    headersObj.set('Authorization', `Bearer ${session.access_token}`);
                    init.headers = headersObj;
                }
            }
        } catch (e) {}
    }
    
    const res = await fetch(input, init);
    if (res.status === 401) {
        const cloned = res.clone();
        try {
            const data = await cloned.json();
            if (data.error === "Session revoked (Device limit exceeded)") {
               console.error("Device limit exceeded. Logging out.");
               if (supabase) await supabase.auth.signOut();
               localStorage.removeItem('vendor_user');
               window.location.href = '/login';
            }
        } catch(e) {}
    }
    return res;
};
