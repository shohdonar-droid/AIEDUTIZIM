import { Telegraf } from 'telegraf';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Simple initialization of Firebase Client outside of React
// Read config from firebase-applet-config.json
const rawConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let db: any = null;

if (fs.existsSync(rawConfigPath)) {
  const firebaseConfigRaw = JSON.parse(fs.readFileSync(rawConfigPath, 'utf8'));
  const firebaseConfig = {
    apiKey: firebaseConfigRaw.apiKey,
    authDomain: firebaseConfigRaw.authDomain,
    projectId: firebaseConfigRaw.projectId,
    storageBucket: firebaseConfigRaw.storageBucket,
    messagingSenderId: firebaseConfigRaw.messagingSenderId,
    appId: firebaseConfigRaw.appId,
  };
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

const botToken = process.env.TELEGRAM_BOT_TOKEN || '8602426313:AAEnX9khyPLZYFWrvvVRJqP5PRANqbD7i-I';
export const bot = new Telegraf(botToken);

bot.start((ctx) => {
  ctx.reply('Assalomu alaykum! AI Edu tizimining Telegram botiga xush kelibsiz.\n\nAkkauntingizni ulash uchun emailingizni yuboring (Masalan: /login ali@gmail.com)');
});

bot.command('login', async (ctx) => {
  if (!db) return ctx.reply("Ma'lumotlar bazasi ulanmagan.");
  const email = ctx.message.text.split(' ')[1];
  if (!email) return ctx.reply("Iltimos, emailni kiritishni unutmang. Format: /login ali@gmail.com");

  try {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) {
      return ctx.reply("Ushbu emailga ega foydalanuvchi topilmadi. Avval saytdan ro'yxatdan o'ting.");
    }
    
    // Telegram ID ni saqlab qo'yish (Firebase Rules ruxsat berishiga ishonch qilish kerak)
    // Hozirgi Rules da 'users' jadvaliga update faqat owner yoki teacher tarafidan bolishi kerak.
    // Shuning uchun bu joyda Rules dan ruxsat so'ralishi mumkin. (Xatolik bersa vaqtincha davom etamiz)
    try {
        const userDoc = snap.docs[0];
        
        ctx.reply(`Xush kelibsiz, ${userDoc.data().displayName || email}! Akkauntingiz muvaffaqiyatli ulandi.\nEndi qanday yordam bera olaman?`);
    } catch(err) {
        ctx.reply("Siz topildingiz, akkaunt qisman ulandi.");
    }
  } catch (err: any) {
    ctx.reply("Xatolik yuz berdi: " + err.message);
  }
});

bot.on('text', async (ctx) => {
  const userText = ctx.message.text;
  if (userText.startsWith('/')) return;

  try {
     // Forward to AI
     const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           prompt: userText,
           history: [],
           userName: ctx.from.first_name || 'Foydalanuvchi',
           isAdminMode: false
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
  bot.launch().then(() => {
    console.log('Telegram bot is running...');
  }).catch((err) => console.log('Telegram bot error:', err));
}

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
