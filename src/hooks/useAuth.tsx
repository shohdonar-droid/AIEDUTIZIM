import React, { useState, useEffect, createContext, useContext } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import safeOnSnapshot from '../lib/safeSnapshot';
import { UserProfile } from '../types';

interface AuthContextType {
  user: (UserProfile & { isImpersonated?: boolean }) | null;
  loading: boolean;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  isAdmin: false,
  refreshUser: async () => {},
  logout: async () => {},
  stopImpersonation: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserDoc = async (uid: string) => {
    try {
      const impId = localStorage.getItem('impersonateUserId');
      const targetUid = impId || uid;
      const userDoc = await getDoc(doc(db, 'users', targetUid));
      if (userDoc.exists()) {
        const udata = userDoc.data() as UserProfile;
        const userWithUid = { ...udata, uid: userDoc.id };
        if (impId && udata.role === 'teacher') {
            // impersonated teacher
            setUser({ ...userWithUid, isImpersonated: true } as any);
        } else {
            setUser(userWithUid);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user doc:", error);
      setUser(null);
    }
  };

  const logout = async () => {
     localStorage.removeItem('impersonateUserId');
     localStorage.removeItem('offline_user_profile');
     localStorage.removeItem('cached_user_profile');
     try {
       await auth.signOut();
     } catch (e) {}
     window.location.href = '/login';
  };

  const stopImpersonation = async () => {
     localStorage.removeItem('impersonateUserId');
     await refreshUser();
     window.location.href = '/admin';
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await fetchUserDoc(auth.currentUser.uid);
    }
  };

  useEffect(() => {
    let userUnsub: (() => void) | null = null;

    // Try to load cached user immediately to speed up UI
    const cachedUser = localStorage.getItem('cached_user_profile');
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
        setLoading(false);
      } catch (e) {}
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (userUnsub) {
        userUnsub();
        userUnsub = null;
      }

      if (firebaseUser) {
        const impId = localStorage.getItem('impersonateUserId');
        const targetUid = impId || firebaseUser.uid;
        
        userUnsub = safeOnSnapshot(doc(db, 'users', targetUid), (snap) => {
          if (snap.exists()) {
            const udata = snap.data() as UserProfile;
            const userWithUid = { ...udata, uid: snap.id };
            
            let finalUser = userWithUid;
            if (impId && udata.role === 'teacher') {
              finalUser = { ...userWithUid, isImpersonated: true } as any;
            }
            
            setUser(finalUser);
            localStorage.setItem('cached_user_profile', JSON.stringify(finalUser));
          } else {
            setUser(null);
            localStorage.removeItem('cached_user_profile');
          }
          setLoading(false);
        }, (err: any) => {
          console.error("User snapshot error:", err);
          if (err?.message?.includes('Quota')) {
            const cached = localStorage.getItem('cached_user_profile');
            if (cached) {
               setUser(JSON.parse(cached));
            } else {
               // Deterministic fallback based on firebaseUser email
               const email = firebaseUser.email || '';
               let role: any = 'student';
               if (email.endsWith('@admin.uz')) role = 'admin';
               else if (email.endsWith('@subadmin.uz')) role = 'subadmin';
               else if (email.endsWith('@teacher.uz')) role = 'teacher';
               
               setUser({
                 uid: firebaseUser.uid,
                 email: firebaseUser.email,
                 displayName: firebaseUser.displayName || 'User',
                 role: role
               } as any);
            }
          }
          setLoading(false);
        });
      } else {
        const offlineProfile = localStorage.getItem('offline_user_profile');
        if (offlineProfile) {
          try {
            setUser(JSON.parse(offlineProfile));
          } catch (e) {
            setUser(null);
            localStorage.removeItem('cached_user_profile');
          }
        } else {
          setUser(null);
          localStorage.removeItem('cached_user_profile');
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (userUnsub) userUnsub();
    };
  }, []);

  useEffect(() => {
    if (!user || user.isImpersonated) return;
    
    const trackSession = async () => {
      const sessionId = localStorage.getItem('sessionId');
      const lastActivityTime = localStorage.getItem('lastActivityTime');
      const now = Date.now();
      
      if (sessionId && lastActivityTime) {
         if (now - parseInt(lastActivityTime) > 3 * 60 * 1000) {
             // Too old, it's a new session. Close old one.
             try {
                await updateDoc(doc(db, 'activityLogs', sessionId), {
                    logoutTime: parseInt(lastActivityTime)
                });
             } catch (e) {}
             
             // Create new session
             try {
                const sessionRef = await addDoc(collection(db, 'activityLogs'), {
                   userId: user.uid,
                   userDisplayName: user.displayName,
                   role: user.role,
                   loginTime: now,
                   lastSeen: now,
                   logoutTime: null,
                   durationMinutes: 0
                });
                localStorage.setItem('sessionId', sessionRef.id);
                localStorage.setItem('sessionStart', now.toString());
                localStorage.setItem('lastActivityTime', now.toString());
             } catch (e) {}
         } else {
             // Continue existing session
             localStorage.setItem('lastActivityTime', now.toString());
             try {
                const sessionStart = localStorage.getItem('sessionStart') || now.toString();
                const durationMinutes = Math.max(0, Math.round((now - parseInt(sessionStart)) / 60000));
                await updateDoc(doc(db, 'activityLogs', sessionId), {
                   lastSeen: now,
                   durationMinutes
                });
             } catch (e) {}
         }
      } else {
         // No session, create one
         try {
            const sessionRef = await addDoc(collection(db, 'activityLogs'), {
               userId: user.uid,
               userDisplayName: user.displayName,
               role: user.role,
               loginTime: now,
               lastSeen: now,
               logoutTime: null,
               durationMinutes: 0
            });
            localStorage.setItem('sessionId', sessionRef.id);
            localStorage.setItem('sessionStart', now.toString());
            localStorage.setItem('lastActivityTime', now.toString());
         } catch(e) {}
      }
    };
    
    trackSession();
    const interval = setInterval(trackSession, 60000);
    
    return () => clearInterval(interval);
  }, [user?.uid, user?.isImpersonated]);

  const isAdmin = user?.role === 'admin' || (user?.email && ['shohdonar@gmail.com', 'elyorbek@admin.uz', 'elyorbek@gmail.com'].includes(user.email));

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, refreshUser, logout, stopImpersonation }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
