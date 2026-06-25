
import { db } from './src/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

async function updateBanner() {
  const docRef = doc(db, 'siteContent', 'main');
  const newBanner = {
    url: '/banner_meeting.jpg',
    type: 'image',
    title: 'Ta\'lim va Tarbiya',
    text: 'Zamonaviy metodikalar',
    description: 'O\'qituvchilar uchun tajriba almashish va yangi texnologiyalarni o\'rganish markazi.'
  };

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, {
        banners: arrayUnion(newBanner)
      });
      console.log('Banner muvaffaqiyatli qo\'shildi!');
    } else {
      console.log('SiteContent/main topilmadi!');
    }
  } catch (err) {
    console.error('Xatolik:', err);
  }
  process.exit();
}

updateBanner();
