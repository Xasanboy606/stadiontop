import { create } from "zustand";
import { type Stadium } from "@/data/stadiums";

export interface Booking {
  id: string;
  stadiumId: string;
  date: string; // YYYY-MM-DD
  hour: number; // 0-23
  hours: number; // duration
  total: number;
  paid: "deposit" | "full";
  addons: string[];
  createdAt: number;
}

export interface MatchPost {
  id: string;
  type: "needPlayers" | "challenge";
  message: string;
  contact: string;
  district?: string;
  hour?: number;
  createdAt: number;
}

export interface StaffNotification {
  id: string;
  stadiumId: string;
  stadiumName: string;
  customerName: string;
  date: string;
  hour: number;
  hours: number;
  paid: "deposit" | "full";
  amount: number;
  read: boolean;
  createdAt: number;
}

export interface EventBooking {
  id: string;
  eventId: string;
  seats: number;
  total: number;
  createdAt: number;
}

interface State {
  bookings: Booking[];
  /** owner-toggled closed slots: `${stadiumId}:${date}:${hour}` */
  closedSlots: Set<string>;
  posts: MatchPost[];
  /** custom price overrides by stadium */
  priceOverrides: Record<string, { day?: number; night?: number }>;
  /** owner-toggled add-on availability overrides */
  addonOverrides: Record<string, Partial<Stadium["addons"]>>;
  staffNotifications: StaffNotification[];
  eventBookings: EventBooking[];

  isBooked: (stadiumId: string, date: string, hour: number) => boolean;
  isClosed: (stadiumId: string, date: string, hour: number) => boolean;
  /** Max consecutive bookable hours starting at `hour`, capped to end-of-day (24). */
  maxAvailableFrom: (stadiumId: string, date: string, hour: number) => number;
  bookSlot: (b: Omit<Booking, "id" | "createdAt">) => Booking | { error: string };
  toggleClosed: (stadiumId: string, date: string, hour: number) => void;
  addPost: (p: Omit<MatchPost, "id" | "createdAt">) => void;
  setPrice: (stadiumId: string, prices: { day?: number; night?: number }) => void;
  setAddonAvailability: (stadiumId: string, addons: Partial<Stadium["addons"]>) => void;
  effectivePrice: (s: Stadium, hour: number) => number;
  effectiveAddons: (s: Stadium) => Stadium["addons"];
  notifyStaff: (n: Omit<StaffNotification, "id" | "createdAt" | "read">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  bookEvent: (eventId: string, seats: number, total: number) => EventBooking;
}


export const useBookingStore = create<State>((set, get) => ({
  bookings: [],
  closedSlots: new Set(),
  posts: [
    {
      id: "p1", type: "needPlayers",
      message: "Bugun 20:00 da Yunusobodda 2 ta o'yinchi kerak. Daraja: o'rta.",
      contact: "+998 90 123 45 67", district: "Yunusobod", hour: 20,
      createdAt: Date.now() - 1000 * 60 * 30,
    },
    {
      id: "p2", type: "challenge",
      message: "FC Toshkent jamoasi ertaga 19:00 da challenge so'raydi (6x6).",
      contact: "@fc_toshkent", district: "Chilonzor", hour: 19,
      createdAt: Date.now() - 1000 * 60 * 90,
    },
  ],
  priceOverrides: {},
  addonOverrides: {},
  staffNotifications: [],
  eventBookings: [],

  setAddonAvailability: (stadiumId, addons) =>
    set((s) => ({
      addonOverrides: {
        ...s.addonOverrides,
        [stadiumId]: { ...s.addonOverrides[stadiumId], ...addons },
      },
    })),

  effectiveAddons: (s) => ({ ...s.addons, ...(get().addonOverrides[s.id] ?? {}) }),

  maxAvailableFrom: (stadiumId, date, hour) => {
    const { isBooked, isClosed } = get();
    let n = 0;
    for (let h = hour; h < 24; h++) {
      if (isBooked(stadiumId, date, h) || isClosed(stadiumId, date, h)) break;
      n++;
    }
    return n;
  },

  notifyStaff: (n) =>
    set((s) => ({
      staffNotifications: [
        { ...n, id: crypto.randomUUID(), createdAt: Date.now(), read: false },
        ...s.staffNotifications,
      ].slice(0, 50),
    })),

  markNotificationRead: (id) =>
    set((s) => ({
      staffNotifications: s.staffNotifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  markAllNotificationsRead: () =>
    set((s) => ({
      staffNotifications: s.staffNotifications.map((n) => ({ ...n, read: true })),
    })),

  bookEvent: (eventId, seats, total) => {
    const eb: EventBooking = {
      id: crypto.randomUUID(), eventId, seats, total, createdAt: Date.now(),
    };
    set((s) => ({ eventBookings: [...s.eventBookings, eb] }));
    return eb;
  },

  isBooked: (stadiumId, date, hour) => {
    return get().bookings.some(
      (b) => b.stadiumId === stadiumId && b.date === date &&
             hour >= b.hour && hour < b.hour + b.hours
    );
  },

  isClosed: (stadiumId, date, hour) =>
    get().closedSlots.has(`${stadiumId}:${date}:${hour}`),

  bookSlot: (b) => {
    const { isBooked, isClosed } = get();
    for (let h = b.hour; h < b.hour + b.hours; h++) {
      if (isBooked(b.stadiumId, b.date, h) || isClosed(b.stadiumId, b.date, h)) {
        return { error: "doubleBooking" };
      }
    }
    const booking: Booking = { ...b, id: crypto.randomUUID(), createdAt: Date.now() };
    set((s) => ({ bookings: [...s.bookings, booking] }));
    return booking;
  },

  toggleClosed: (stadiumId, date, hour) =>
    set((s) => {
      const key = `${stadiumId}:${date}:${hour}`;
      const next = new Set(s.closedSlots);
      next.has(key) ? next.delete(key) : next.add(key);
      return { closedSlots: next };
    }),

  addPost: (p) =>
    set((s) => ({
      posts: [{ ...p, id: crypto.randomUUID(), createdAt: Date.now() }, ...s.posts],
    })),

  setPrice: (stadiumId, prices) =>
    set((s) => ({
      priceOverrides: {
        ...s.priceOverrides,
        [stadiumId]: { ...s.priceOverrides[stadiumId], ...prices },
      },
    })),

  effectivePrice: (s, hour) => {
    const override = get().priceOverrides[s.id];
    const isNight = hour >= 18 || hour < 7;
    if (isNight) return override?.night ?? s.pricePerHourNight;
    return override?.day ?? s.pricePerHourDay;
  },
}));
