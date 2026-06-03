import { create } from "zustand";
import { api, SiteSettings } from "@/lib/api";

export type { SiteSettings, HeroTexts } from "@/lib/api";

export const DEFAULT_SETTINGS: SiteSettings = {
  hero: {
    slides: [
      { url: "https://loremflickr.com/1920/1080/camp,nou?lock=1",        label: "Camp Nou · Barcelona" },
      { url: "https://loremflickr.com/1920/1080/bernabeu,stadium?lock=1", label: "Santiago Bernabéu · Madrid" },
      { url: "https://loremflickr.com/1920/1080/wembley,stadium?lock=1",  label: "Wembley Stadium · London" },
      { url: "https://loremflickr.com/1920/1080/allianz,arena?lock=1",    label: "Allianz Arena · München" },
    ],
    texts: {
      uz: { badge: "Toshkent · 100+ stadion", line1: "Maydon top.", line2: "O'yna.", line3: "G'olib bo'l.", subtitle: "Toshkentdagi 100+ stadiondan birini real vaqtda band qiling." },
      ru: { badge: "Ташкент · 100+ стадионов", line1: "Найди поле.", line2: "Играй.", line3: "Побеждай.", subtitle: "Забронируйте одно из 100+ полей Ташкента в реальном времени." },
    },
  },
  stats: [
    { value: "100+",    label_uz: "Stadion",       label_ru: "Стадионов" },
    { value: "10 000+", label_uz: "Bron",          label_ru: "Броней" },
    { value: "4.9",     label_uz: "Reyting",       label_ru: "Рейтинг" },
    { value: "5 000+",  label_uz: "Foydalanuvchi", label_ru: "Пользователей" },
  ],
  sections: { howItWorks: true, trustStats: true, ctaBanner: true, footer: true, statsBar: true, testimonials: true },
  testimonials: [
    { name: "Jasur Toshmatov", role: "Futbol murabbiyi",      quote: "Har hafta maydon izlash dardim tugadi. 2 daqiqada bron, QR bilan kirish — bu professional platforma.",                      initials: "JT", bookings: "47 ta bron" },
    { name: "Dilshod Yusupov", role: "Jamoa kapitani",        quote: "Ilgari qo'ng'iroq qilardik, hozir — telefon. To'lov ham oson, qaytarish ham tez. Hech qachon bu qadar qulay bo'lmagan.", initials: "DY", bookings: "23 ta bron" },
    { name: "Rustam Nazarov",  role: "Stadion egasi · 3 maydon", quote: "Oyiga 40% ko'proq bron oldik. Dashboard aniq ko'rsatadi qaysi soat band. Biznesim uchun eng to'g'ri qaror.",           initials: "RN", bookings: "120+ mijoz" },
  ],
  howItWorks: [
    { step: "01", title: "Stadion toping",     sub: "Tuman, vaqt va narx bo'yicha filtrlab eng mos maydonni tanlang.",                           accent: "#22c55e", tag: "Smart qidiruv" },
    { step: "02", title: "Onlayn bron qiling", sub: "Qulay vaqtni tanlang — to'liq yoki 30% depozit bilan bir necha soniyada bandlang.",         accent: "#f59e0b", tag: "Tezkor to'lov" },
    { step: "03", title: "O'ynang!",           sub: "QR-kod orqali kirish. Hech qanday qog'oz, navbat yoki qo'ng'iroq yo'q.",                   accent: "#8b5cf6", tag: "QR kirish"    },
  ],
  ownerBenefits: [
    { text: "Real vaqtda daromad statistikasi" },
    { text: "Avtomatik bron va to'lov tizimi" },
    { text: "Escrow orqali himoyalangan to'lovlar" },
    { text: "5 000+ faol foydalanuvchi bazasi" },
    { text: "QR kirish va mijoz boshqaruvi" },
    { text: "SEO va marketing yordami" },
  ],
  cta: {
    title_uz: "Stadioningizni\nbiz bilan boshqaring",
    title_ru: "Управляйте\nстадионом с нами",
    subtitle_uz: "Stadion egasimisiz? Platformamizga qo'shiling va onlayn bronlarni avtomatlashtiring.",
    subtitle_ru: "Вы владелец стадиона? Присоединяйтесь к нашей платформе.",
    telegramLink: "https://t.me/xmanydv",
  },
  contact: { phone: "+998 90 398 02 32", address_uz: "Toshkent, O'zbekiston", address_ru: "Ташкент, Узбекистан", telegram: "https://t.me/xmanydv" },
};

interface SettingsStore {
  settings: SiteSettings | null;
  loading: boolean;
  load: () => Promise<void>;
  save: (data: SiteSettings) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  loading: false,

  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const data = await api.settings.get();
      set({ settings: data });
    } catch {
      // keep null — components fall back to hardcoded defaults
    } finally {
      set({ loading: false });
    }
  },

  save: async (data: SiteSettings) => {
    await api.settings.update(data);
    set({ settings: data });
  },
}));
