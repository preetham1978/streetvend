const fs = require('fs');
let code = fs.readFileSync('src/lib/auth.tsx', 'utf8');

const sessionCheckCode = `
    // Device session enforcement
    useEffect(() => {
        if (user?.id) {
            const checkSession = async () => {
                const currentSessionId = localStorage.getItem('device_session_id') || ('s_' + Math.random().toString(36).substring(2, 9));
                localStorage.setItem('device_session_id', currentSessionId);
                
                const isMobile = /iphone|ipad|ipod|android|mobile/.test(navigator.userAgent.toLowerCase());
                const deviceName = isMobile ? 'Mobile Browser (This Device)' : 'Chrome on Desktop (This Browser)';
                const deviceType = isMobile ? 'mobile' : 'desktop';

                try {
                    const res = await fetch(\`/api/vendor/\${user.id}/sessions\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId: currentSessionId,
                            deviceName,
                            deviceType,
                            location: 'India'
                        })
                    });
                    
                    if (res.status === 403) {
                         // Block new session if server refuses
                         console.error("Device limit reached.");
                         signOut();
                         return;
                    }
                    
                    const data = await res.json();
                    if (data.success && data.sessions) {
                        const isValid = data.sessions.some((s: any) => s.id === currentSessionId);
                        if (!isValid) {
                            console.error("Session revoked by server.");
                            signOut();
                        }
                    }
                } catch (err) {
                    console.error("Session check failed", err);
                }
            };
            
            checkSession();
            const interval = setInterval(checkSession, 30000); // Check every 30s
            return () => clearInterval(interval);
        }
    }, [user?.id]);
`;

code = code.replace("const fetchVendorProfile = async", sessionCheckCode + "\n    const fetchVendorProfile = async");
fs.writeFileSync('src/lib/auth.tsx', code);
