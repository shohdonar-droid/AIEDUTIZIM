import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

async function run() {
  const ref = doc(db, 'siteContent', 'main');
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};
  const hero = data.hero || {};
  
  const contentP = `💡 Ushbu platforma - o'qituvchilar, tashkilotlar va talabalar uchun yagona markazlashgan raqamli ta'lim tizimidir. Platformada siz quyidagilarni amalga oshirishingiz mumkin:

🚀 ASOSIY IMKONIYATLAR:

1. Modulli Kurslar & O'quv jarayonini boshqarish
Talabalar qaysi modulga yetib kelganini vizual tarzda ko'rishlari, topshiriqlarni yuklashlari va kurs doirasidagi materiallar bilan tanishishlari mumkin. Har bir modul mustaqil o'rganiladi va natijalar statistika sahifasida yig'ilib boradi. 

2. Interaktiv Qiziqarli "Quizizz" Testlar 🎮
Talabalarning o'tilgan materialni qay darajada o'zlashtirganligini tekshirish uchun "Quizizz" uslubidagi qiziqarli musobaqali testlar yordam beradi. Tizim o'yin yakunlangandan so'ng, faxrli 1-o'rinni egallagan ishtirokchiga Avtomatik Sertifikat taqdim etadi 🏆. 

3. Sun'iy Intellekt yordamida Test Yozish (AI) 🤖
Endi test tuzish uchun soatlab vaqt sarflamaysiz. O'qituvchilar kerakli mavzuni yozishlari bilan AI ularga eng sifatli test savollarini avtomatik yaratib beradi.

4. Sertifikatlar avtomatizatsiyasi
Har bir muvaffaqiyatli topshirilgan kurs, mavzulashtirilgan test yoki "Quizizz" ishtiroki yakunida, ishtirokchilarga QR kod va unikal ID orqali himoyalangan original sertifikat yaratib beriladi. Ushbu sertifikatning haqiqiyligini saytdagi maxsus qidiruv orqali ham isbotlash mumkin.

5. Ijtimoiy Tarmoq & Chat
Guruh yoki platforma ichidagi hamkasblar bilan o'zaro tajriba almashish uchun ajratilgan xavfsiz chat paneli - tezkor, qulay va yagona muloqot markazi bo'lib xizmat qiladi.`;

  hero.infoSections = [
    {
      id: String(Date.now()),
      name: "Platforma Haqida",
      content: contentP,
      images: [],
      files: [],
      isProtected: false
    }
  ];

  await setDoc(ref, { hero }, { merge: true });
  console.log('Successfully updated infoSections!');
  process.exit(0);
}
run();
