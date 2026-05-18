import React, { useState, useEffect, createContext, useContext } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
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
        if (impId && udata.role === 'teacher') {
            // impersonated teacher
            setUser({ ...udata, isImpersonated: true } as any);
        } else {
            setUser(udata);
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
     await auth.signOut();
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

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (userUnsub) {
        userUnsub();
        userUnsub = null;
      }

      if (firebaseUser) {
        const impId = localStorage.getItem('impersonateUserId');
        const targetUid = impId || firebaseUser.uid;
        
        userUnsub = onSnapshot(doc(db, 'users', targetUid), (snap) => {
          if (snap.exists()) {
            const udata = snap.data() as UserProfile;
            const userWithUid = { ...udata, uid: snap.id };
            
            if (impId && udata.role === 'teacher') {
              setUser({ ...userWithUid, isImpersonated: true } as any);
            } else {
              setUser(userWithUid);
            }
          } else {
            setUser(null);
          }
          setLoading(false);
        }, (err) => {
          console.error("User snapshot error:", err);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (userUnsub) userUnsub();
    };
  }, []);

  const isAdmin = user?.role === 'admin' || (user?.email && ['shohdonar@gmail.com', 'elyorbek@admin.uz', 'elyorbek@gmail.com'].includes(user.email));

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, refreshUser, logout, stopImpersonation }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
