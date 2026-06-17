import React, { useState, useEffect, createContext, useContext } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
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
     
     const sessionId = localStorage.getItem('sessionId');
     if (sessionId && db) {
       try {
         const sessionStart = Number(localStorage.getItem('sessionStart') || Date.now());
         const rawLastTime = localStorage.getItem('lastActivityTime');
         const finalActiveTime = rawLastTime ? Number(rawLastTime) : Date.now();
         const duration = Math.max(1, Math.round((finalActiveTime - sessionStart) / 60000));
         await updateDoc(doc(db, 'activityLogs', sessionId), {
           logoutTime: finalActiveTime,
           durationMinutes: duration
         });
       } catch (shErr) {
         console.error("Failed to close session on logout:", shErr);
       }
       localStorage.removeItem('sessionId');
       localStorage.removeItem('sessionStart');
       localStorage.removeItem('lastActivityTime');
     }

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
    } else {
      const offlineProfile = localStorage.getItem('offline_user_profile');
      if (offlineProfile) {
        try {
          const udata = JSON.parse(offlineProfile);
          setUser(udata);
          localStorage.setItem('cached_user_profile', offlineProfile);
        } catch (e) {
          console.error("Refresh user offline error:", e);
        }
      }
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
        
        // Automated google user migration for staff profiles to mustaqil_o_qituvchi
        const isGoogleUser = firebaseUser.providerData.some(p => p.providerId === 'google.com') || firebaseUser.email?.endsWith('@gmail.com');
        const ADMIN_EMAILS = ['shohdonar@gmail.com', 'elyorbek@admin.uz', 'elyorbek@gmail.com'];
        const isUserAdmin = ADMIN_EMAILS.includes(firebaseUser.email || '');

        if (isGoogleUser && !isUserAdmin && !impId) {
          try {
            const docRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(docRef);
            if (userSnap.exists()) {
              const udata = userSnap.data();
              if (udata?.role === 'staff') {
                // Get or create UY Home organization Id
                let uyOrgId = '';
                const q = query(collection(db, 'users'), where('role', '==', 'teacher'), where('displayName', '==', 'UY'));
                const uySnap = await getDocs(q);
                if (!uySnap.empty) {
                  uyOrgId = uySnap.docs[0].id;
                } else {
                  const uyRef = await addDoc(collection(db, 'users'), {
                    displayName: 'UY',
                    role: 'teacher',
                    status: 'active',
                    createdAt: serverTimestamp(),
                    limit_departments: 9999,
                    limit_groups: 9999,
                    limit_students: 9999,
                    limit_subjects: 9999,
                    limit_tests: 9999,
                    limit_quizizz: 9999,
                    limit_exams: 9999,
                    limit_certificates: 9999
                  });
                  uyOrgId = uyRef.id;
                }

                const defaultLimits = {
                  limit_departments: 1,
                  limit_groups: 1,
                  limit_students: 5,
                  limit_subjects: 2,
                  limit_tests: 2,
                  limit_quizizz: 1,
                  limit_exams: 1,
                  limit_courses: 0,
                  limit_certificates: 5,
                  limit_tests_per_subject: 10,
                  limit_questions_per_test: 10,
                  limit_questions_per_quizizz: 5,
                  limit_questions_per_exam: 10,
                };

                const mergedLimits = {
                  limit_departments: udata.limit_departments ?? defaultLimits.limit_departments,
                  limit_groups: udata.limit_groups ?? defaultLimits.limit_groups,
                  limit_students: udata.limit_students ?? defaultLimits.limit_students,
                  limit_subjects: udata.limit_subjects ?? defaultLimits.limit_subjects,
                  limit_tests: udata.limit_tests ?? defaultLimits.limit_tests,
                  limit_quizizz: udata.limit_quizizz ?? defaultLimits.limit_quizizz,
                  limit_exams: udata.limit_exams ?? defaultLimits.limit_exams,
                  limit_certificates: udata.limit_certificates ?? defaultLimits.limit_certificates,
                  limit_courses: udata.limit_courses ?? defaultLimits.limit_courses,
                  limit_tests_per_subject: udata.limit_tests_per_subject ?? defaultLimits.limit_tests_per_subject,
                  limit_questions_per_test: udata.limit_questions_per_test ?? defaultLimits.limit_questions_per_test,
                  limit_questions_per_quizizz: udata.limit_questions_per_quizizz ?? defaultLimits.limit_questions_per_quizizz,
                  limit_questions_per_exam: udata.limit_questions_per_exam ?? defaultLimits.limit_questions_per_exam,
                };

                await setDoc(docRef, {
                  role: 'mustaqil_o_qituvchi',
                  teacherId: uyOrgId,
                  ...mergedLimits
                }, { merge: true });
                console.log("Migrated Google user from 'staff' to 'mustaqil_o_qituvchi' with limits successfully");
              }
            }
          } catch (mgrErr) {
            console.error("Migration during auth change failed:", mgrErr);
          }
        }
        
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
                await setDoc(doc(db, 'activityLogs', sessionId), {
                    logoutTime: parseInt(lastActivityTime)
                }, { merge: true });
             } catch (e) {}
             
             // Create new session
             try {
                const sessionRef = await addDoc(collection(db, 'activityLogs'), {
                   userId: user.uid,
                   userDisplayName: user.displayName,
                   role: user.role,
                   loginTime: now,
                   lastSeen: now,
                   lastActiveTime: now,
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
                await setDoc(doc(db, 'activityLogs', sessionId), {
                   lastSeen: now,
                   lastActiveTime: now,
                   durationMinutes
                }, { merge: true });
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
               lastActiveTime: now,
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

  const isAdmin = user?.role === 'admin' || user?.role === 'subadmin' || (user?.email && ['shohdonar@gmail.com', 'elyorbek@admin.uz', 'elyorbek@gmail.com'].includes(user.email));

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, refreshUser, logout, stopImpersonation }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
