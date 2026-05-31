import { Telegraf } from 'telegraf';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp, setDoc, deleteField, onSnapshot, getDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Simple initialization of Firebase Client outside of React
const rawConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let db: any = null;
let firebaseApiKey = '';
let firebaseProjectId = '';

if (fs.existsSync(rawConfigPath)) {
  const firebaseConfigRaw = JSON.parse(fs.readFileSync(rawConfigPath, 'utf8'));
  firebaseApiKey = firebaseConfigRaw.apiKey;
  firebaseProjectId = firebaseConfigRaw.projectId;
  const firebaseConfig = {
    apiKey: firebaseConfigRaw.apiKey,
    authDomain: firebaseConfigRaw.authDomain,
    projectId: firebaseConfigRaw.projectId,
    storageBucket: firebaseConfigRaw.storageBucket,
    messagingSenderId: firebaseConfigRaw.messagingSenderId,
    appId: firebaseConfigRaw.appId,
  };
  const app = initializeApp(firebaseConfig);
  db = initializeFirestore(app, {}, firebaseConfigRaw.firestoreDatabaseId);
}

const botToken = process.env.TELEGRAM_BOT_TOKEN || '8602426313:AAEnX9khyPLZYFWrvvVRJqP5PRANqbD7i-I';
export const bot = new Telegraf(botToken);

const pendingLogins = new Map<number, { step: string, email?: string, targetUserId?: string }>();
const authedUsers = new Map<number, { uid: string, displayName: string, role: string, email: string, docId?: string }>();

async function getKeyboard(role: string = 'student', userId?: number) {
  if (role === 'admin' || role === 'teacher') {
    let telegramUserCount = 0;
    if (db) {
        try {
            const snap = await getDocs(query(collection(db, 'telegram_users')));
            telegramUserCount = snap.size;
        } catch (e) {}
    }
    return [
      [{ text: '🔑 Kirish' }, { text: '🚪 Chiqish' }],
      [{ text: `👥 Foydalanuvchilar soni: ${telegramUserCount}` }],
      [{ text: '📢 E\'lon berish' }]
    ];
  }
  return [
    [{ text: '🔑 Kirish' }, { text: '🚪 Chiqish' }],
    [{ text: '📨 Adminga murojaat qilish' }]
  ];
};

async function getAuthedUser(userId: number) {
    let authed = authedUsers.get(userId);
    if (!authed && db) {
        try {
            const snap = await getDocs(query(collection(db, 'users'), where('telegramId', '==', userId)));
            if (!snap.empty) {
                const uData = snap.docs[0].data();
                authed = {
                    uid: uData.uid,
                    displayName: uData.displayName || uData.email,
                    role: uData.role || 'student',
                    email: uData.email
                };
                authedUsers.set(userId, authed);
            }
        } catch (e) {
            console.error("DB check auth error:", e);
        }
    }
    return authed;
}

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  
  // Save every user to telegram_users collection for broadcast purposes
  if (db) {
      try {
          await setDoc(doc(db, 'telegram_users', String(userId)), {
              telegramId: userId,
              firstName: ctx.from.first_name || '',
              lastName: ctx.from.last_name || '',
              username: ctx.from.username || '',
              lastActive: new Date().toISOString()
          }, { merge: true });
      } catch (e) {
          console.error("Failed to save telegram user", e);
      }
  }

  const authed = await getAuthedUser(userId);
  const role = authed ? authed.role : 'student';

  let greeting = "Assalomu alaykum! AIEDUTIZIM platformasining telegram botiga xush kelibsiz! 👋\n\nQuyidagi menyulardan foydalanishingiz mumkin:\n🔑 KIRISH - Profilingizga kirish uchun\n🚪 CHIQISH - Profilingizdan chiqish uchun\n📨 Adminga murojaat qilish - Admin bilan bog'lanish uchun\n\n🤖 Shuningdek, sizni qiziqtirgan savollarni to'g'ridan-to'g'ri yuborishingiz mumkin. AI yordamida savolingizga tezkor javob berishga harakat qilaman!";

  if (authed) {
    greeting = `Assalomu alaykum, ${authed.displayName}! 👋\nSiz hozirda ${authed.role.toUpperCase()} profilidasiz.\n\nAIEDUTIZIM platformasining telegram botiga xush kelibsiz!\n\n🤖 Shuningdek, sizni qiziqtirgan savollarni to'g'ridan-to'g'ri yuborishingiz mumkin. AI yordamida savolingizga tezkor javob berishga harakat qilaman!`;
  }

  ctx.reply(greeting, {
    reply_markup: {
      keyboard: await getKeyboard(role, userId),
      resize_keyboard: true
    }
  });
});

bot.command('login', (ctx) => {
  if (!db) return ctx.reply("Ma'lumotlar bazasi ulanmagan.");
  pendingLogins.set(ctx.from.id, { step: 'email' });
  ctx.reply("Profilga kirish uchun loginingizni yoki emailingizni kiriting:");
});

bot.command('app', (ctx) => {
  ctx.reply(`AI Edu platformasini Telegram ichidan chiqmasdan to'liq ishlatish uchun quyidagi tugmani bosing va Miniapp-ga kiring:`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📱 Miniapp'ni ochish", web_app: { url: "https://aiedutizim.vercel.app" } }]
      ]
    }
  });
});

bot.action(/reply_(.+)/, (ctx) => {
    const targetUserId = ctx.match[1];
    pendingLogins.set(ctx.from.id, { step: 'reply_message', targetUserId });
    ctx.reply("Javob xabarini yuboring (bu unga Telegram va tizim orqali boradi):");
    ctx.answerCbQuery();
});

bot.action(/viewmsg_(.+)/, async (ctx) => {
    const targetUserId = ctx.match[1];
    ctx.answerCbQuery();
    
    try {
        const adminUid = authedUsers.get(ctx.from.id)?.uid;
        if (!adminUid) return ctx.reply("Sizning profilingiz aniqlanmadi.");
        
        let msgs: any[] = [];
        const q1 = query(collection(db, 'messages'), where('senderId', '==', targetUserId));
        const snap1 = await getDocs(q1);
        msgs.push(...snap1.docs.map(d => ({...d.data(), id: d.id})));

        const q2 = query(collection(db, 'messages'), where('receiverId', '==', targetUserId));
        const snap2 = await getDocs(q2);
        msgs.push(...snap2.docs.map(d => ({...d.data(), id: d.id})));
        
        const seen = new Set();
        msgs = msgs.filter(d => {
            if (seen.has(d.id)) return false;
            seen.add(d.id);
            return d.receiverId === adminUid || d.receiverRole === 'admin' || d.senderId === adminUid || d.senderRole === 'admin';
        }).sort((a,b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));
             
        if (msgs.length === 0) {
            return ctx.reply("Xabarlar topilmadi.");
        }
        
        msgs = msgs.slice(-20); // last 20
        
        let text = `<b>${msgs[msgs.length - 1].senderName || 'Foydalanuvchi'} bilan yozishmalar:</b>\n\n`;
        for (const m of msgs) {
            const roleName = (m.senderId === adminUid || m.senderRole === 'admin') ? 'Siz' : (m.senderName || 'U');
            text += `👤 <b>${roleName}:</b> ${m.text || ''}\n`;
        }
        
        ctx.reply(text, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    { text: '✍️ Javob yozish', callback_data: `reply_${targetUserId}` }
                ]]
            }
        });
        
    } catch(e) {
        ctx.reply("Xatolik: " + (e as any).message);
    }
});

// Filter deleted handling here

bot.on('message', async (ctx) => {
  const userId = ctx.from.id;
  const pending = pendingLogins.get(userId);
  const authed = await getAuthedUser(userId);

  // Broadcast step
  if (pending && pending.step === 'broadcast_message') {
      pendingLogins.delete(userId);
      const m = ctx.message;
      ctx.reply(`E'lon tarqatish tezkor tarzda boshlandi... Kuting.`);
      
      try {
          const tgUsersSnap = await getDocs(query(collection(db, 'telegram_users')));
          
          (async () => {
              let count = 0;
              for (const uDoc of tgUsersSnap.docs) {
                  const uData = uDoc.data();
                  if (uData.telegramId) {
                      const tgId = Number(uData.telegramId);
                      if (tgId !== userId) {
                          try {
                              await bot.telegram.copyMessage(tgId, ctx.chat.id, m.message_id);
                              count++;
                          } catch (e) {}
                          await new Promise(r => setTimeout(r, 40));
                      }
                  }
              }
              bot.telegram.sendMessage(userId, `Tayyor! E'lon yuborildi: jami ${count} ta foydalanuvchiga muvaffaqiyatli yetkazildi.`).catch(e => console.error(e));
          })();
          
          return;
      } catch (e) {
          return ctx.reply("E'lon yuborishda xatolik yuz berdi.");
      }
  }

  const userText = ('text' in ctx.message) ? ctx.message.text : '';

  if (userText.startsWith('/')) return; // Ignore other commands

  if (userText === '🔑 Kirish') {
    if (!db) return ctx.reply("Ma'lumotlar bazasi ulanmagan.");
    if (authed) {
      return ctx.reply(`Siz hozirda ${authed.displayName} (${authed.role.toUpperCase()}) profilidasiz. Boshqa profilga kirish uchun avval "🚪 Chiqish" tugmasini bosing.`);
    }
    pendingLogins.set(userId, { step: 'email' });
    return ctx.reply("Profilga kirish uchun loginingizni yoki emailingizni kiriting:");
  }

  if (userText.startsWith('👥 Foydalanuvchilar soni:')) {
      return; // Ignore this button click
  }

  if (userText === '🚪 Chiqish') {
    pendingLogins.delete(userId);
    if (authed && db) {
        try {
            const snap = await getDocs(query(collection(db, 'users'), where('telegramId', '==', userId)));
            if (!snap.empty) {
                await updateDoc(doc(db, 'users', snap.docs[0].id), { telegramId: deleteField() });
            }
        } catch (e) {
            console.error("Logout error", e);
        }
    }
    authedUsers.delete(userId);
    ctx.reply("Siz tizimdan chiqdingiz p(T_T)q.", {
        reply_markup: { keyboard: await getKeyboard('student', userId), resize_keyboard: true }
    });
    return;
  }
  
  if (userText === "📢 E'lon berish") {
      if (!authed || authed.role !== 'admin') {
          return ctx.reply("Sizda bu huquq yo'q.");
      }
      pendingLogins.set(userId, { step: 'broadcast_message' });
      return ctx.reply("Yuboriladigan e'lon matni, rasm yoki videoni yuboring:");
  }
  
// deleted murojaatlarga javob berish

  if (userText === '📨 Adminga murojaat qilish' || userText === '📨 Adminga murojat qilish' || userText === 'Adminga murojat qilish' || userText === 'Adminga murojaat qilish') {
      pendingLogins.set(userId, { step: 'admin_message' });
      return ctx.reply("Taklif va savollaringizni bizga yuboring!\n✍️ Xabaringizni bitta matn ko‘rinishida yuboring.");
  }

  // Handle remaining logic
  if (pending) {
    if (pending.step === 'reply_message') {
        const uName = authed ? authed.displayName : 'Admin';
        const senderId = authed ? authed.uid : 'SYSTEM_ADMIN';
        
        pendingLogins.delete(userId);
        
        try {
            await addDoc(collection(db, 'messages'), {
                senderId: senderId,
                senderName: uName + ' (Admin / Telegram)',
                senderRole: 'admin',
                receiverId: pending.targetUserId,
                text: userText,
                timestamp: serverTimestamp(),
                isRead: false,
                fromTelegram: true
            });
            return ctx.reply("Javobingiz muvaffaqiyatli yuborildi.");
        } catch (e) {
            return ctx.reply("Xatolik yuz berdi: " + (e as any).message);
        }
    } else if (pending.step === 'email') {
      let emailInput = userText.trim();
      
      if (!emailInput.includes('@')) {
          try {
             // Look up by login
             const ADMIN_LOGIN = 'Elyorbek';
             const ADMIN_EMAIL = 'elyorbek@admin.uz';
             if (emailInput.toLowerCase() === ADMIN_LOGIN.toLowerCase()) {
                 emailInput = ADMIN_EMAIL;
             } else {
                 const q = query(collection(db, 'users'), where('login', '==', emailInput));
                 const snap = await getDocs(q);
                 if (!snap.empty) {
                     emailInput = snap.docs[0].data().email;
                 } else {
                     emailInput += '@student.uz';
                 }
             }
          } catch(e) {
             emailInput += '@student.uz';
          }
      }
      
      pending.email = emailInput;
      pending.step = 'password';
      pendingLogins.set(userId, pending);
      return ctx.reply("Endi parolingizni kiriting:");
    } else if (pending.step === 'admin_message') {
      const uName = authed ? authed.displayName : (ctx.from.first_name || 'Foydalanuvchi');
      const senderId = authed ? authed.uid : `tg_${userId}`;
      const senderRole = authed ? authed.role : 'bot_user';

      if (db) {
          try {
              await addDoc(collection(db, 'messages'), {
                  senderId: senderId,
                  senderName: uName + ' (Telegram)',
                  receiverId: 'SYSTEM_ADMIN',
                  receiverRole: 'admin',
                  text: userText,
                  timestamp: serverTimestamp(),
                  isRead: false,
                  fromTelegram: true
              });

              if (!authed) {
                  await getDocs(query(collection(db, 'users'), where('uid', '==', senderId))).then(async (snap) => {
                      if (snap.empty) {
                          await setDoc(doc(db, 'users', senderId), {
                              uid: senderId,
                              displayName: uName + ' (Telegram)',
                              role: senderRole,
                              telegramId: userId
                          });
                      }
                  });
              }
          } catch (e) {
              console.error("Failed to add admin message", e);
          }
      }
      pendingLogins.delete(userId);
      return ctx.reply("Murojaatingiz imkon qadar tezroq ko‘rib chiqiladi va sizga javob beriladi. agar yana Adminga murojaat qilmoqchi bolsangiz Adminga murojaat qilish menyusidan foydalaning");
    } else if (pending.step === 'password') {
      const email = pending.email!;
      const password = userText;
      pendingLogins.delete(userId);

      ctx.reply("Ma'lumotlar tekshirilmoqda, iltimos kuting...");

      try {
        const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true })
        });
        const authData = await authRes.json();

        if (authData.error) {
          return ctx.reply("Email (Login) yoki parol noto'g'ri. Qaytadan urinish uchun ishchi oynada 🔑 Kirish ni bering.");
        }

        const uid = authData.localId;
        
        let displayName = email;
        let role = 'student';
        let departmentName = "Kiritilmagan";
        let groupName = "Kiritilmagan";
        
        try {
           let docId = '';
           const uQuery = query(collection(db, 'users'), where('uid', '==', uid));
           const snap = await getDocs(uQuery);
           if (!snap.empty) {
               docId = snap.docs[0].id;
               const uData = snap.docs[0].data();
               displayName = uData.displayName || email;
               role = uData.role || 'student';
               departmentName = uData.departmentName || "Kiritilmagan";
               groupName = uData.groupName || "Kiritilmagan";
               
               try {
                  await updateDoc(doc(db, 'users', docId), { telegramId: userId });
               } catch(e) {}
           }
           
           const encodedCreds = encodeURIComponent(Buffer.from(`${email}:${password}`).toString('base64'));
           const autoLoginUrl = `https://aiedutizim.vercel.app/login?auto=${encodedCreds}`;
           
           let replyMsg = `✅ Akkauntingiz muvaffaqiyatli ulandi!\n\n👤 F.I.SH: ${displayName}\n🛡 Profil: ${role.toUpperCase()}`;
           
           if (role === 'student') {
               replyMsg += `\n🎓 Yo'nalishi: ${departmentName}\n👥 Guruhi: ${groupName}`;
           }

           replyMsg += `\n\nEndi "Tizimga kirish" tugmasi orqali o'z profilingizga to'g'ridan to'g'ri o'tishingiz mumkin!`;

           authedUsers.set(userId, { uid, displayName, role, email, docId });

           ctx.reply(replyMsg, {
              reply_markup: {
                  inline_keyboard: [
                      [{ text: "📱 Tizimga kirish", web_app: { url: autoLoginUrl } }]
                  ]
              }
           });
           
           ctx.reply("Asosiy menyu yangilandi:", {
               reply_markup: { keyboard: await getKeyboard(role, userId), resize_keyboard: true }
           });
        } catch (e) {
           const encodedCreds = encodeURIComponent(Buffer.from(`${email}:${password}`).toString('base64'));
           const autoLoginUrl = `https://aiedutizim.vercel.app/login?auto=${encodedCreds}`;
           
           authedUsers.set(userId, { uid, displayName: email, role: 'student', email, docId: '' });
           
           ctx.reply(`✅ Akkauntingiz muvaffaqiyatli ulandi!\n\nEmail: ${email}\n\nEndi "Tizimga kirish" tugmasi orqali o'z profilingizga to'g'ridan to'g'ri o'tishingiz mumkin!`, {
              reply_markup: {
                  inline_keyboard: [
                      [{ text: "📱 Tizimga kirish", web_app: { url: autoLoginUrl } }]
                  ]
              }
           });
           
           ctx.reply("Asosiy menyu yangilandi:", {
               reply_markup: { keyboard: await getKeyboard('student', userId), resize_keyboard: true }
           });
        }
      } catch (err: any) {
        ctx.reply("Xatolik yuz berdi: " + err.message);
      }
      return;
    }
  }

  // Not in login flow, handle as AI chat prompt
  try {
     const uName = authed ? authed.displayName : (ctx.from.first_name || 'Foydalanuvchi');
     const isAdmin = authed ? (authed.role === 'admin' || authed.role === 'teacher') : false;

     const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           prompt: userText,
           history: [],
           userName: uName,
           isAdminMode: isAdmin
        })
     });

     if (res.ok) {
        const data = await res.json();
        ctx.reply(data.reply || "Xatolik...");
     } else {
        const data = await res.json().catch(() => null);
        ctx.reply(data?.error || "AI javob qaytara olmadi.");
     }
  } catch(e) {
     ctx.reply("Server bilan bog'lanishda xatolik yuz berdi.");
  }
});

export function launchBot() {
  bot.telegram.setMyDescription("**Assalomu alaykum! AIEDUTIZIM platformasining telegram botiga xush kelibsiz!**\n\n🎓 AIEDUTIZIM — tashkilotlar, o‘qituvchilar va talabalar uchun mo‘ljallangan yagona markazlashgan raqamli ta'lim platformasi bo‘lib, zamonaviy ta'lim jarayonlarini samarali boshqarish imkonini beradi.")
    .catch(e => console.error("Could not set bot description", e));

  bot.launch().then(() => {
    console.log('Telegram bot is running...');
    bot.telegram.setChatMenuButton({
      menuButton: {
        type: 'web_app',
        text: '📱 Open App',
        web_app: { url: 'https://aiedutizim.vercel.app' }
      }
    }).catch(e => console.error("Could not set menu button", e));

    if (db) {
       // Listen for new messages targeting tg users
       let isInit = false;
       {

           onSnapshot(collection(db, 'messages'), async (snapshot) => {
               if (!isInit) {
                   isInit = true;
                   return;
               }
               const newChanges = snapshot.docChanges().filter(c => c.type === 'added');
               for (const change of newChanges) {
                   const mData = change.doc.data();
                   if (mData.senderId !== mData.receiverId) {
                       try {
                           
                           // Identify recipients
                           let recipients: any[] = [];
                           if (mData.receiverRole === 'admin') {
                               const adminSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
                               const teacherSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));
                               const orgSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'organization')));
                               adminSnap.forEach(d => recipients.push(d.data()));
                               teacherSnap.forEach(d => recipients.push(d.data()));
                               orgSnap.forEach(d => recipients.push(d.data()));
                           } else if (mData.receiverId && mData.receiverId !== 'SYSTEM_ADMIN') {
                               if (mData.receiverId.startsWith('tg_')) {
                                  const tgIdStr = mData.receiverId.replace('tg_', '');
                                  recipients.push({
                                      telegramId: Number(tgIdStr),
                                      role: 'student'
                                  });
                               } else {
                                  const uSnap = await getDoc(doc(db, 'users', mData.receiverId));
                                  if (uSnap.exists()) recipients.push(uSnap.data());
                               }
                           }
                           
                           for (const uData of recipients) {
                               if (uData.telegramId) {
                                   const tgId = Number(uData.telegramId);
                                   
                                   let senderDetails = '';
                                   if (mData.senderId && !mData.senderId.startsWith('SYSTEM_ADMIN') && !mData.senderId.startsWith('tg_')) {
                                       const senderSnap = await getDoc(doc(db, 'users', mData.senderId));
                                       if (senderSnap.exists()) {
                                           const sData = senderSnap.data();
                                           const rMap: Record<string, string> = {
                                               'organization': 'Tashkilot',
                                               'teacher': 'Xodim/O\'qituvchi',
                                               'student': 'Talaba',
                                               'admin': 'Admin'
                                           };
                                           const roleLabel = rMap[sData.role] || sData.role || 'Foydalanuvchi';
                                           senderDetails = ` (${roleLabel}: ${sData.displayName || mData.senderName})`;
                                       } else {
                                           senderDetails = ` (${mData.senderName})`;
                                       }
                                   } else {
                                       senderDetails = ` (${mData.senderName || (mData.senderRole === 'admin' ? 'Tizim Administratori' : 'Kimdir')})`;
                                   }
                                   
                                   let opts: any = {};
                                   let messageText = '';
                                   if (uData.role === 'admin' || uData.role === 'teacher') {
                                       opts.reply_markup = {
                                           inline_keyboard: [[
                                               { text: '✍️ Javob yozish', callback_data: `reply_${mData.senderId}` }
                                           ]]
                                       };
                                       messageText = `📨 Yangi xabar${senderDetails}:\n\n${mData.text}`;
                                   } else {
                                       messageText = `📨 Sizga Admindan xabar keldi:\n\n${mData.text}`;
                                   }

                                   bot.telegram.sendMessage(tgId, messageText, opts).catch(e => console.error("TG MSG: ", e));
                               }
                           }
                       } catch (e) {
                           console.error("Error sending TG msg", e);
                       }
                   }
               }
           });
           
           // Listen for new published tests
           let testIsInit = false;
           onSnapshot(collection(db, 'tests'), async (snapshot) => {
               if (!testIsInit) {
                   testIsInit = true;
                   return;
               }
               const newChanges = snapshot.docChanges().filter(c => c.type === 'added');
               for (const change of newChanges) {
                   const tData = change.doc.data();
                   if (tData.isPublished) {
                       // Find all users in related groups or departments that have a telegram ID
                       try {
                           const uQuery = query(collection(db, 'users'), where('role', '==', 'student'));
                           const allStudentsSnap = await getDocs(uQuery);
                           
                           allStudentsSnap.forEach(userDoc => {
                               const uData = userDoc.data();
                               if (uData.telegramId) {
                                   const isMatched = (tData.groupIds && tData.groupIds.includes(uData.groupId)) ||
                                                     (tData.departmentIds && tData.departmentIds.includes(uData.departmentId));
                                   if (isMatched) {
                                       bot.telegram.sendMessage(Number(uData.telegramId), `📝 Sizning guruhingiz/yo'nalishingiz uchun yangi test(topshiriq) yuklandi: "${tData.title}". Tizimga kirib ishlashingiz mumkin!`).catch(e => console.error("TG MSG: ", e));
                                   }
                               }
                           });
                       } catch (e) {
                           console.error("Test notification error:", e);
                       }
                   }
               }
           });
       }
    }

  }).catch((err: any) => {
    if (err?.response?.error_code === 409) {
      console.log('Telegram bot conflict (409): already running. Ignoring.');
    } else {
      console.log('Telegram bot error:', err);
    }
  });
}

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
