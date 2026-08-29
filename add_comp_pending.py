import sys

with open('telegram.ts', 'r') as f:
    content = f.read()

# Add pending logic before `} else if (pending.step === "password") {`
pending_code = """    } else if (pending.step === "admin_comp_add_name") {
      pending.shopName = userText;
      pending.step = "admin_comp_add_services";
      return ctx.reply("📋 Endi ushbu kompyuterxonaning xizmatlari ro'yxatini yuboring (masalan: Kserokopiya, format qilish):");
    } else if (pending.step === "admin_comp_add_services") {
      pending.shopServices = userText;
      pending.step = "admin_comp_add_address";
      return ctx.reply("📍 Endi manzilni yuboring:");
    } else if (pending.step === "admin_comp_add_address") {
      pending.shopAddress = userText;
      pending.step = "admin_comp_add_contact";
      return ctx.reply("📞 Endi bog'lanish ma'lumotlarini yuboring (telefon raqam va h.k):");
    } else if (pending.step === "admin_comp_add_contact") {
      pending.shopContact = userText;
      pending.step = "admin_comp_add_photo";
      return ctx.reply("🖼 Endi kompyuterxonaning rasmini yuboring (yoki rasmsiz saqlash uchun 'skip' deb yozing):");
    } else if (pending.step === "admin_comp_add_photo") {
        let photoId = "";
        const msg = ctx.message as any;
        if (msg.photo && msg.photo.length > 0) {
            photoId = msg.photo[msg.photo.length - 1].file_id;
        }
        
        try {
            await addDoc(collection(db, "computer_services"), {
                name: pending.shopName || "Nomsiz",
                services: pending.shopServices || "",
                address: pending.shopAddress || "",
                contact: pending.shopContact || "",
                photoId: photoId
            });
            pendingLogins.delete(userId);
            
            const authed = await getAuthedUser(userId);
            ctx.reply("✅ Yangi kompyuter xizmatlari ro'yxatga qo'shildi!", {
                reply_markup: { keyboard: await getKeyboard(authed?.role, userId, !!authed), resize_keyboard: true }
            });
        } catch (e) {
            console.error(e);
            return ctx.reply("❌ Xatolik yuz berdi");
        }
        return;
    } else if (pending.step === "admin_comp_edit_do") {
        const shopId = pending.shopId;
        const field = pending.editField;
        let updateData: any = {};
        
        if (field === "photo") {
            const msg = ctx.message as any;
            if (msg.photo && msg.photo.length > 0) {
                updateData.photoId = msg.photo[msg.photo.length - 1].file_id;
            } else {
                updateData.photoId = "";
            }
        } else {
            updateData[field] = userText;
        }
        
        try {
            await updateDoc(doc(db, "computer_services", shopId), updateData);
            pendingLogins.delete(userId);
            const authed = await getAuthedUser(userId);
            ctx.reply("✅ Ma'lumot muvaffaqiyatli yangilandi!", {
                 reply_markup: { keyboard: await getKeyboard(authed?.role, userId, !!authed), resize_keyboard: true }
            });
        } catch (e) {
            console.error(e);
            return ctx.reply("❌ Xatolik yuz berdi");
        }
        return;
    } else if (pending.step === "password") {"""

if '} else if (pending.step === "password") {' in content:
    content = content.replace('} else if (pending.step === "password") {', pending_code, 1)
    with open('telegram.ts', 'w') as f:
        f.write(content)
    print("Added pending handlers")
else:
    print("Failed to find password pending block")

