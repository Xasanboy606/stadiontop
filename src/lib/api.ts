const BASE = "/api";

function getToken() {
  return localStorage.getItem("st_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("st_token", token);
  else localStorage.removeItem("st_token");
}

async function req<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error ?? res.statusText);
  return data as T;
}

const get = <T>(path: string) => req<T>(path);
const post = <T>(path: string, body: unknown) =>
  req<T>(path, { method: "POST", body: JSON.stringify(body) });
const patch = <T>(path: string, body: unknown) =>
  req<T>(path, { method: "PATCH", body: JSON.stringify(body) });
const del = <T = unknown>(path: string) =>
  req<T>(path, { method: "DELETE" });

/* ── Auth ───────────────────────────────────────── */
export const api = {
  auth: {
    login: (email: string, password: string) =>
      post<{ token: string; user: ApiUser }>("/auth/login", { email, password }),
    register: (body: {
      email: string; password: string; full_name: string;
      phone?: string; as_owner?: boolean;
    }) => post<{ token: string; user: ApiUser }>("/auth/register", body),
    me: () => get<ApiUser>("/auth/me"),
    updateProfile: (body: { full_name?: string; phone?: string }) =>
      patch<ApiUser>("/auth/me", body),
    claimFirstAdmin: () => post("/auth/claim-first-admin", {}),
    forgotPassword: (email: string) =>
      post<{ ok: boolean; resetLink?: string; token?: string }>("/auth/forgot-password", { email }),
    resetPassword: (token: string, password: string) =>
      post<{ ok: boolean }>("/auth/reset-password", { token, password }),
    changePassword: (current_password: string, new_password: string) =>
      patch<{ ok: boolean }>("/auth/change-password", { current_password, new_password }),
  },

  stadiums: {
    list: () => get<StadiumRow[]>("/stadiums"),
    get: (id: string) => get<StadiumRow>(`/stadiums/${id}`),
    slots: (id: string, date: string) => get<SlotRow[]>(`/stadiums/${id}/slots?date=${date}`),
    bookedHours: (date: string) => get<Record<string, number[]>>(`/stadiums/booked-hours?date=${date}`),
    create: (body: Partial<StadiumRow>) => post<StadiumRow>("/stadiums", body),
    update: (id: string, body: Partial<StadiumRow>) => patch<StadiumRow>(`/stadiums/${id}`, body),
  },

  bookings: {
    list: () => get<BookingRow[]>("/bookings"),
    create: (body: Partial<BookingRow>) => post<BookingRow>("/bookings", body),
    cancel: (id: string) => patch<{ refund_amount: number; refund_pct: number }>(`/bookings/${id}/cancel`, {}),
    verify: (token: string) => get<{ ok: boolean; booking: BookingRow }>(`/bookings/verify/${token}`),
  },

  reviews: {
    list: (stadiumId: string) => get<ReviewRow[]>(`/reviews/${stadiumId}`),
    upsert: (body: Partial<ReviewRow>) => post<ReviewRow>("/reviews", body),
  },

  editRequests: {
    list: () => get<EditRequestRow[]>("/edit-requests"),
    create: (body: Partial<EditRequestRow>) => post<EditRequestRow>("/edit-requests", body),
  },

  admin: {
    stats: () => get<{ users: number; stadiums: number; bookings: number; revenue: number }>("/admin/stats"),
    stadiums: () => get<StadiumRow[]>("/admin/stadiums"),
    setStadiumStatus: (id: string, status: string) =>
      patch(`/admin/stadiums/${id}/status`, { status }),
    editRequests: () => get<EditRequestRow[]>("/admin/edit-requests"),
    resolveEditRequest: (id: string, action: string, admin_response?: string) =>
      patch(`/admin/edit-requests/${id}`, { action, admin_response }),
    profiles: () => get<ProfileRow[]>("/admin/profiles"),
    toggleBlock: (id: string, is_blocked: boolean) =>
      patch(`/admin/profiles/${id}/block`, { is_blocked }),
    toggleRole: (id: string, role: string, action: "add" | "remove") =>
      patch(`/admin/profiles/${id}/role`, { role, action }),
    transactions: () => get<TransactionRow[]>("/admin/transactions"),
    releaseEscrow: (id: string) => patch(`/admin/transactions/${id}/release`, {}),
    createStadium: (body: Partial<StadiumRow> & { images: string[] }) =>
      post<StadiumRow>("/admin/stadiums", body),
    updateStadium: (id: string, body: Partial<StadiumRow> & { images?: string[] }) =>
      patch<StadiumRow>(`/admin/stadiums/${id}`, body),
    deleteStadium: (id: string) =>
      del(`/admin/stadiums/${id}`),
    stadiumSummaries: () => get<StadiumSummaryRow[]>("/admin/stadium-summaries"),
    stadiumStats: (id: string) => get<StadiumStats>(`/admin/stadiums/${id}/stats`),
    stadiumBookings: (id: string, p?: { from?: string; to?: string; payment_status?: string; booking_status?: string }) => {
      const qs = Object.entries(p ?? {}).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join("&");
      return get<BookingRow[]>(`/admin/stadiums/${id}/bookings${qs ? "?" + qs : ""}`);
    },
    stadiumFinancial: (id: string, p?: { from?: string; to?: string }) => {
      const qs = Object.entries(p ?? {}).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join("&");
      return get<StadiumFinancial>(`/admin/stadiums/${id}/financial${qs ? "?" + qs : ""}`);
    },
    stadiumTransfers: (id: string) => get<TransferRow[]>(`/admin/stadiums/${id}/transfers`),
    addTransfer: (id: string, body: { amount: number; note?: string }) =>
      post<TransferRow>(`/admin/stadiums/${id}/transfers`, body),
    owners: () => get<UnassignedOwner[]>("/admin/owners"),
    unassignedOwners: () => get<UnassignedOwner[]>("/admin/unassigned-owners"),
    assignOwner: (stadiumId: string, ownerId: string) =>
      patch(`/admin/stadiums/${stadiumId}/assign-owner`, { owner_id: ownerId }),
  },

  owner: {
    stadiums: () => get<StadiumRow[]>("/owner/stadiums"),
    bookings: () => get<BookingRow[]>("/owner/bookings"),
    closedSlots: (stadium_id: string, date: string) =>
      get<number[]>(`/owner/closed-slots?stadium_id=${stadium_id}&date=${date}`),
    toggleClosedSlot: (stadium_id: string, date: string, hour: number) =>
      post<{ closed: boolean }>("/owner/closed-slots/toggle", { stadium_id, date, hour }),
    rangeStats: (from: string, to: string) =>
      get<OwnerRangeStats>(`/owner/range-stats?from=${from}&to=${to}`),
  },

  notifications: {
    list: () => get<NotificationRow[]>("/notifications"),
    markRead: (id: string) => patch(`/notifications/${id}/read`, {}),
    markAllRead: () => patch("/notifications/read-all", {}),
  },

  settings: {
    get: () => get<SiteSettings>("/settings"),
    update: (body: SiteSettings) => patch<SiteSettings>("/settings", body),
  },

  upload: {
    image: async (file: File): Promise<string> => {
      const token = getToken();
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${BASE}/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error ?? res.statusText);
      return (data as { url: string }).url;
    },
  },

  events: {
    list: () => get<EventRow[]>("/events/public"),
    listAuth: () => get<EventRow[]>("/events"),
    book: (id: string, seats: number) =>
      post<{ ok: boolean; seats: number; total: number; event: EventRow }>(`/events/${id}/book`, { seats }),
    myBookings: () => get<EventBookingRow[]>("/events/my-bookings"),
    adminList: () => get<EventRow[]>("/admin/events"),
    adminCreate: (body: Partial<EventRow>) => post<EventRow>("/admin/events", body),
    adminUpdate: (id: string, body: Partial<EventRow>) => patch<EventRow>(`/admin/events/${id}`, body),
    adminDelete: (id: string) => del(`/admin/events/${id}`),
  },

  matchmaking: {
    list: () => get<MatchPostRow[]>("/matchmaking"),
    create: (body: { type: string; message: string; contact: string; district?: string; hour?: number }) =>
      post<MatchPostRow>("/matchmaking", body),
    delete: (id: string) => del(`/matchmaking/${id}`),
  },
};

/* ── Types ──────────────────────────────────────── */
export interface ApiUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_blocked?: boolean;
  roles: string[];
}

export interface StadiumRow {
  id: string; owner_id: string; name: string; district: string;
  address: string; description: string | null; size: string | null;
  price_day: number; price_night: number;
  facilities: string[]; has_referee: boolean; has_video: boolean;
  has_balls: boolean; has_bibs: boolean;
  images: string[]; lat: number | null; lng: number | null;
  rating: number | null; reviews: number | null;
  status: "pending" | "approved" | "rejected";
  created_at: string; updated_at: string;
}

export interface SlotRow { hour: number; duration: number; }

export interface BookingRow {
  id: string; user_id: string; stadium_id: string;
  booking_date: string; hour: number; duration: number;
  base_price: number; addons_price: number; service_fee: number;
  total: number; paid_amount: number; refund_amount: number;
  payment_kind: string; payment_provider: string;
  addons: string[]; status: string;
  short_code: string; qr_token: string;
  verified_at: string | null; cancelled_at: string | null;
  cancellation_reason: string | null; created_at: string;
  stadiums?: { name: string; district?: string; address?: string; lat?: number | null; lng?: number | null } | null;
  customer_name?: string | null;
  customer_phone?: string | null;
}

export interface ReviewRow {
  id: string; user_id: string; stadium_id: string;
  booking_id: string | null; rating: number; comment: string | null;
  created_at: string; full_name?: string | null;
}

export interface EditRequestRow {
  id: string; supervisor_id: string; stadium_id: string;
  field_name: string; old_value: string | null; new_value: string;
  status: string; admin_response: string | null;
  created_at: string; reviewed_at: string | null;
  stadiums?: { name: string } | null;
  profiles?: { full_name: string | null } | null;
  stadium_name?: string; full_name?: string;
}

export interface ProfileRow {
  id: string; email: string; full_name: string | null;
  phone: string | null; is_blocked: boolean;
  created_at: string; roles: string[];
}

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface HeroTexts {
  badge: string;
  line1: string;
  line2: string;
  line3: string;
  subtitle: string;
}

export interface SiteSettings {
  hero: {
    slides: { url: string; label: string }[];
    texts: { uz: HeroTexts; ru: HeroTexts };
  };
  stats: { value: string; label_uz: string; label_ru: string }[];
  sections: {
    howItWorks: boolean;
    trustStats: boolean;
    ctaBanner: boolean;
    footer: boolean;
    statsBar: boolean;
    testimonials: boolean;
  };
  testimonials?: {
    name: string; role: string; quote: string;
    initials: string; bookings: string;
  }[];
  howItWorks?: { step: string; title: string; sub: string; tag: string; accent: string }[];
  ownerBenefits?: { text: string }[];
  cta: {
    title_uz: string; title_ru: string;
    subtitle_uz: string; subtitle_ru: string;
    telegramLink: string;
  };
  contact: {
    phone: string;
    address_uz: string; address_ru: string;
    telegram: string;
  };
}

export interface TransactionRow {
  id: string; booking_id: string; user_id: string;
  amount: number; commission_amount: number; provider: string;
  status: string; escrow_status: string;
  external_ref: string | null; released_at: string | null;
  created_at: string;
  bookings?: { short_code: string; booking_date: string } | null;
}

export interface EventRow {
  id: string; league: string; title: string;
  home_team: string; away_team: string;
  event_date: string; venue: string; district: string;
  price_per_seat: number; capacity: number; taken: number;
  accent: string; emoji: string; image_url?: string | null; is_active: boolean;
  created_at: string;
  my_seats?: number;
}

export interface EventBookingRow {
  id: string; event_id: string; user_id: string;
  seats: number; total: number; created_at: string;
  title?: string; league?: string; home_team?: string; away_team?: string;
  event_date?: string; venue?: string; district?: string; price_per_seat?: number;
}

export interface StadiumSummaryRow {
  id: string; name: string; district: string; status: string;
  today_bookings: number; today_paid: number; today_commission: number;
}

export interface TransferRow {
  id: string; stadium_id: string; owner_id: string | null; admin_id: string;
  amount: number; note: string | null; created_at: string; admin_name?: string | null;
}

export interface StadiumStats { today: number; week: number; month: number; }

export interface StadiumFinancial {
  total_expected: number; total_paid: number; commission: number;
  net_to_owner: number; transferred: number; pending_transfer: number;
}

export interface OwnerRangeStats {
  total_bookings: number; games_count: number; expected_revenue: number;
  paid_amount: number; deposit_paid: number; full_paid: number; pending_amount: number;
}

export interface UnassignedOwner {
  id: string; email: string; full_name: string | null; phone: string | null;
}

export interface MatchPostRow {
  id: string; user_id: string | null; author_name: string | null;
  type: "needPlayers" | "challenge";
  message: string; contact: string;
  district: string | null; hour: number | null;
  created_at: string;
  profile_name?: string | null;
}
