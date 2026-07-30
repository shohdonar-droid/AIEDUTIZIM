import { db } from './firebase';
import { 
  doc, 
  runTransaction, 
  collection, 
  addDoc, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

export interface TariffActivationResult {
  success: boolean;
  reason?: 'insufficient_balance' | 'user_not_found' | 'error';
  message: string;
  currentBalance?: number;
  requiredPrice?: number;
  newBalance?: number;
}

/**
 * Transaction-safe activation of tariff using user's balance.
 */
export async function activateTariffWithBalance(
  userId: string,
  tariffKey: string,
  tariffConfig: {
    name: string;
    price: number;
    students?: number;
    staff?: number;
    maxStudents?: number;
    maxStaff?: number;
    maxCourses?: number;
    maxTests?: number;
    maxExams?: number;
    maxSubjects?: number;
    maxQuizizz?: number;
    hasAI?: boolean;
    hasBot?: boolean;
  },
  customLimits?: any
): Promise<TariffActivationResult> {
  const tariffPrice = Number(tariffConfig.price) || 0;
  const userRef = doc(db, 'users', userId);

  try {
    let result: TariffActivationResult = {
      success: false,
      message: 'Noma\'lum xatolik'
    };

    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        result = {
          success: false,
          reason: 'user_not_found',
          message: 'Foydalanuvchi topilmadi.'
        };
        return;
      }

      const userData = userDoc.data();
      const currentBalance = Number(userData.balance ?? userData.ball ?? 0);

      if (currentBalance < tariffPrice) {
        result = {
          success: false,
          reason: 'insufficient_balance',
          currentBalance,
          requiredPrice: tariffPrice,
          message: "Hisobingizdagi mablag' ushbu tarifni faollashtirish uchun yetarli emas. Avval hisobingizni to'ldiring."
        };
        return;
      }

      // Sufficient balance: Deduct tariff price atomically
      const newBalance = currentBalance - tariffPrice;
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Prepare limits update
      const limitUpdates: any = {};
      if (customLimits) {
        limitUpdates.studentLimit = Number(customLimits.students) || 0;
        limitUpdates.staffLimit = Number(customLimits.staff) || 0;
        limitUpdates.courseLimit = Number(customLimits.courses) || 0;
        limitUpdates.testLimit = Number(customLimits.tests) || 0;
        limitUpdates.examLimit = Number(customLimits.exams) || 0;
        limitUpdates.subjectLimit = Number(customLimits.subjects) || 0;
        limitUpdates.quizizzLimit = Number(customLimits.quizizz) || 0;
        limitUpdates.hasAi = !!customLimits.ai;
        limitUpdates.hasBot = !!customLimits.bot;
      } else {
        limitUpdates.studentLimit = Number(tariffConfig.students || tariffConfig.maxStudents || 0);
        limitUpdates.staffLimit = Number(tariffConfig.staff || tariffConfig.maxStaff || 0);
        if (tariffConfig.maxCourses !== undefined) limitUpdates.courseLimit = tariffConfig.maxCourses;
        if (tariffConfig.maxTests !== undefined) limitUpdates.testLimit = tariffConfig.maxTests;
        if (tariffConfig.maxExams !== undefined) limitUpdates.examLimit = tariffConfig.maxExams;
        if (tariffConfig.maxSubjects !== undefined) limitUpdates.subjectLimit = tariffConfig.maxSubjects;
        if (tariffConfig.maxQuizizz !== undefined) limitUpdates.quizizzLimit = tariffConfig.maxQuizizz;
        if (tariffConfig.hasAI !== undefined) limitUpdates.hasAi = tariffConfig.hasAI;
        if (tariffConfig.hasBot !== undefined) limitUpdates.hasBot = tariffConfig.hasBot;
      }

      // Update user document
      transaction.update(userRef, {
        balance: newBalance,
        ball: newBalance,
        activeTariff: tariffConfig.name,
        assignedTariff: tariffConfig.name,
        tariffName: tariffConfig.name,
        tariffPrice: tariffPrice,
        tariffStartDate: Timestamp.fromDate(startDate),
        tariffEndDate: Timestamp.fromDate(endDate),
        lastTariffUpdate: serverTimestamp(),
        ...limitUpdates
      });

      result = {
        success: true,
        newBalance,
        message: `${tariffConfig.name} tarifi muvaffaqiyatli faollashtirildi! Balansingizdan ${tariffPrice.toLocaleString('uz-UZ')} UZS yechildi.`
      };
    });

    if (result.success) {
      // Add active subscription record
      await addDoc(collection(db, 'active_subscriptions'), {
        userId,
        userName: tariffConfig.name,
        tariffName: tariffConfig.name,
        startDate: serverTimestamp(),
        endDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        paymentType: 'Balans',
        tariffPrice,
        limits: customLimits || null,
        status: 'active'
      }).catch(e => console.warn('active_subscriptions write err:', e));

      // Add payment history record
      await addDoc(collection(db, 'payment_history'), {
        userId,
        amount: tariffPrice,
        type: 'out',
        description: `${tariffConfig.name} tarifi faollashtirildi (-${tariffPrice.toLocaleString('uz-UZ')} UZS)`,
        paymentType: 'Balans',
        createdAt: serverTimestamp()
      }).catch(e => console.warn('payment_history write err:', e));

      // Add notification record
      await addDoc(collection(db, 'notifications'), {
        userId,
        title: 'Tarif faollashtirildi',
        message: `${tariffConfig.name} tarifi muvaffaqiyatli faollashtirildi. Amal qilish muddati: 30 kun. Balansingiz: ${result.newBalance?.toLocaleString('uz-UZ')} UZS`,
        createdAt: serverTimestamp(),
        isRead: false
      }).catch(e => console.warn('notifications write err:', e));
    }

    return result;
  } catch (error: any) {
    console.error('activateTariffWithBalance error:', error);
    return {
      success: false,
      reason: 'error',
      message: 'Xatolik yuz berdi: ' + (error?.message || String(error))
    };
  }
}

/**
 * Top up user balance safely
 */
export async function topUpUserBalance(
  userId: string,
  amount: number,
  paymentType: string,
  description?: string
): Promise<{ success: boolean; newBalance?: number; message: string }> {
  const userRef = doc(db, 'users', userId);
  try {
    let newBalance = 0;
    await runTransaction(db, async (transaction) => {
      const uDoc = await transaction.get(userRef);
      if (!uDoc.exists()) throw new Error("Foydalanuvchi topilmadi");
      const current = Number(uDoc.data()?.balance ?? uDoc.data()?.ball ?? 0);
      newBalance = current + amount;
      transaction.update(userRef, {
        balance: newBalance,
        ball: newBalance,
        updatedAt: serverTimestamp()
      });
    });

    await addDoc(collection(db, 'payment_history'), {
      userId,
      amount,
      type: 'in',
      description: description || `Hisob to'ldirildi (${paymentType}): +${amount.toLocaleString('uz-UZ')} UZS`,
      paymentType,
      createdAt: serverTimestamp()
    });

    await addDoc(collection(db, 'notifications'), {
      userId,
      title: "Hisob to'ldirildi",
      message: `Hisobingiz muvaffaqiyatli ${amount.toLocaleString('uz-UZ')} UZS ga to'ldirildi. Joriy balansingiz: ${newBalance.toLocaleString('uz-UZ')} UZS`,
      createdAt: serverTimestamp(),
      isRead: false
    });

    return {
      success: true,
      newBalance,
      message: `Hisobingiz ${amount.toLocaleString('uz-UZ')} UZS ga to'ldirildi!`
    };
  } catch (err: any) {
    console.error("topUpUserBalance error:", err);
    return {
      success: false,
      message: "Xatolik yuz berdi: " + (err?.message || String(err))
    };
  }
}
