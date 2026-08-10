# 📸 3x4 Passport Photo Processing Microservice

Ushbu mikroservis foydalanuvchi fotosuratini professional hujjatlar (pasport, diplom, ariza va h.k.) uchun yaroqli, 3x4 sm (354x472 px, 300 DPI) o'lchamdagi, sof oq fonli rasmga aylantirib beradi.

---

## ⚡ 5-Bosqichli Ishlov Berish Algoritmi (Pipeline)

1. **`detect_face_and_crop()`**: MediaPipe Face Detection yordamida yuz joylashuvi aniqlanadi va kadr balandligining ~72% qismini yuz egallaydigan qilib 3:4 nisbatda dastlabki kesim olinadi. Yuz topilmasa, aniq va tushunarli o'zbekcha xatolik xabari qaytariladi.
2. **`remove_background()`**: `rembg` (ISNet model) va `alpha_matting=True` orqali odam figurasi piksel darajasida ajratib olinadi.
3. **`clean_mask_edges()`**: OpenCV `cv2.erode` + `cv2.GaussianBlur` + binary thresholding yordamida alpha maska chegarasidagi g'adir-budurliklar va feathering effektlari tozalanadi.
4. **`composite_on_white_canvas()`**: RGBA subyekt toza oq canvas (`RGB 255, 255, 255`) ustiga `Image.alpha_composite()` orqali qo'yiladi va alpha kanal butunlay olib tashlanadi.
5. **`resize_to_document_size()`**: Yakuniy rasm 300 DPIda aniq 354x472 pikselga keltirilib, JPEG (quality=95) ko'rinishida saqlanadi.

---

## 🚀 Railway'da Ishga Tushirish (Deploy Guide)

1. Ushbu `/passport_service` papkasini GitHub repongizga push qiling yoki Railway Dashboard'da yangi loyiha ochib, papkani tanlang.
2. Railway avtomatik ravishda `Dockerfile` faylini aniqlaydi va konteynerni build qiladi.
3. Railway bergan URL manzilini olib, Telegram Bot `.env` fayliga `PASSPORT_SERVICE_URL` sifatida kiriting:
   ```env
   PASSPORT_SERVICE_URL=https://your-railway-app.up.railway.app
   ```

---

## 📩 Telegram Bot Kodiga Integratsiya Qilish (Node.js / TypeScript)

`telegram.ts` yoki `src/lib/passportProcessor.ts` faylida mikroservisni chaqirish kodi:

```typescript
import fetch from "node-fetch";
import FormData from "form-data";

export async function processPassportPhoto3x4(inputBuffer: Buffer): Promise<Buffer> {
  const serviceUrl = process.env.PASSPORT_SERVICE_URL || "http://localhost:8000";
  
  const form = new FormData();
  form.append("file", inputBuffer, { filename: "photo.jpg", contentType: "image/jpeg" });

  const res = await fetch(`${serviceUrl}/process-3x4`, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Xatolik yuz berdi" }));
    throw new Error(errorData.detail || "Rasmga ishlov berishda xatolik");
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function createPrintSheet(photo3x4Buffer: Buffer, copies: number = 4): Promise<Buffer> {
  const serviceUrl = process.env.PASSPORT_SERVICE_URL || "http://localhost:8000";
  
  const form = new FormData();
  form.append("file", photo3x4Buffer, { filename: "3x4_photo.jpg", contentType: "image/jpeg" });
  form.append("copies", copies.toString());

  const res = await fetch(`${serviceUrl}/create-print-sheet`, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });

  if (!res.ok) {
    throw new Error("4 nusxali varaq yaratishda xatolik");
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

---

## 📊 Firestore Logging & Telegram Flow

Har bir so'rov bajarilganda Telegram bot Firestore `photo_logs` kolleksiyasida quyidagi statistikani saqlaydi:
- `user_id`: Foydalanuvchi Telegram IDsi
- `timestamp`: So'rov vaqti
- `status`: `"success"` / `"error"`
- `processing_time_ms`: Ishlov berish davomiyligi
- `error_message`: Xatolik kelib chiqqan bo'lsa, xatolik sababi
