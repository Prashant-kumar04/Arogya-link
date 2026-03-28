// src/app/hooks/useSessionRestore.ts - Session restoration on app load
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import useHealthStore from '../store/useHealthStore';

// Manual JWT decode (header.payload.signature)
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');

    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (err) {
    console.error('Failed to decode JWT:', err);
    return null;
  }
}

export function useSessionRestore() {
  const navigate = useNavigate();
  const { setUser, setToken } = useHealthStore();

  useEffect(() => {
    const restoreSession = () => {
      try {
        const token = localStorage.getItem('jwt_token');

        if (token) {
          // Decode JWT to check expiry
          const decoded = decodeJWT(token);

          if (!decoded) {
            throw new Error('Failed to decode token');
          }

          const now = Math.floor(Date.now() / 1000);

          // Check if token is expired
          if (decoded.exp && decoded.exp < now) {
            // Token expired
            localStorage.removeItem('jwt_token');
            setUser(null);
            setToken(null);
            return;
          }

          // Token is valid - restore user session silently
          const user = {
            id: decoded.id || decoded.user_id || decoded.sub || '',
            phone: decoded.phone || decoded.mobile || '',
            name: decoded.name || null,
          };

          setUser(user);
          setToken(token);

          // Only navigate if not already on dashboard
          const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
          if (pathname === '/') {
            navigate('/dashboard', { replace: true });
          }
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
        try {
          localStorage.removeItem('jwt_token');
        } catch (e) {
          // Ignore
        }
        setUser(null);
        setToken(null);
      }
    };

    restoreSession();
  }, [setUser, setToken, navigate]);
}
