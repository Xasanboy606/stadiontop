export type Facility = "shower" | "dressing" | "parking" | "lights" | "artificial" | "natural" | "cafe" | "wifi";
export type District =
  | "Yunusobod" | "Sergeli" | "Chilonzor" | "Mirzo Ulug'bek"
  | "Yashnobod" | "Shayxontohur" | "Olmazor" | "Mirobod" | "Yakkasaroy" | "Uchtepa";

export const DISTRICTS: District[] = [
  "Yunusobod", "Sergeli", "Chilonzor", "Mirzo Ulug'bek",
  "Yashnobod", "Shayxontohur", "Olmazor", "Mirobod", "Yakkasaroy", "Uchtepa",
];

export const FACILITY_LABELS: Record<Facility, { uz: string; ru: string }> = {
  shower:    { uz: "Dush",            ru: "Душ" },
  dressing:  { uz: "Kiyinish xonasi", ru: "Раздевалка" },
  parking:   { uz: "Avtoturargoh",    ru: "Парковка" },
  lights:    { uz: "Tungi yoritish",  ru: "Освещение" },
  artificial:{ uz: "Sun'iy maysa",    ru: "Искусств. газон" },
  natural:   { uz: "Tabiiy maysa",    ru: "Натуральный газон" },
  cafe:      { uz: "Kafe",            ru: "Кафе" },
  wifi:      { uz: "Wi-Fi",           ru: "Wi-Fi" },
};

export interface Stadium {
  id: string;
  name: string;
  district: District;
  address: string;
  lat: number;
  lng: number;
  images: string[];
  rating: number;
  reviews: number;
  pricePerHourDay: number;   // UZS
  pricePerHourNight: number; // UZS
  facilities: Facility[];
  size: "5x5" | "6x6" | "7x7" | "8x8" | "11x11";
  description: string;
  /** Hours that are already booked today (0-23) */
  bookedToday: number[];
  /** Owner-controlled add-on availability */
  addons: { referee: boolean; video: boolean; balls: boolean; bibs: boolean };
}

/**
 * Each stadium gets photos from a specific famous European venue via loremflickr.
 * Tag = venue name on Flickr → returns real professional stadium photos.
 * lock=N keeps the same photo on every render (deterministic).
 */
const flickr = (tags: string, lock: number) =>
  `https://loremflickr.com/900/600/${tags}?lock=${lock}`;

/* Prebuilt image sets — each tuple is [main, side-a, side-b] */
const WEMBLEY    = [flickr("wembley,stadium", 1),  flickr("wembley,stadium", 2),  flickr("wembley,stadium", 3)];
const BERNABEU   = [flickr("bernabeu,stadium", 1), flickr("bernabeu,stadium", 2), flickr("bernabeu,stadium", 3)];
const ALLIANZ    = [flickr("allianz,arena", 1),    flickr("allianz,arena", 2),    flickr("allianz,arena", 3)];
const CAMPNOU    = [flickr("camp,nou", 1),          flickr("camp,nou", 2),          flickr("camp,nou", 3)];
const ANFIELD    = [flickr("anfield,stadium", 1),  flickr("anfield,stadium", 2),  flickr("anfield,stadium", 3)];
const OLDTRAFFORD= [flickr("old,trafford", 1),     flickr("old,trafford", 2),     flickr("old,trafford", 3)];
const MARACANA   = [flickr("maracana,stadium", 1), flickr("maracana,stadium", 2), flickr("maracana,stadium", 3)];
const SANSIRO    = [flickr("san,siro,stadium", 1), flickr("san,siro,stadium", 2), flickr("san,siro,stadium", 3)];

export const STADIUMS: Stadium[] = [
  {
    id: "green-arena",
    name: "Green Arena",
    district: "Yunusobod",
    address: "Amir Temur shoh ko'chasi 108, Toshkent",
    lat: 41.3603, lng: 69.2897,
    images: WEMBLEY,
    rating: 4.8, reviews: 142,
    pricePerHourDay: 250000, pricePerHourNight: 350000,
    facilities: ["shower", "dressing", "parking", "lights", "artificial", "cafe"],
    size: "6x6",
    description: "Premium yopiq stadion zamonaviy sun'iy maysa va professional yoritish bilan.",
    bookedToday: [9, 10, 14, 18, 19, 20],
    addons: { referee: true, video: true, balls: true, bibs: true },
  },
  {
    id: "sergeli-pitch",
    name: "Sergeli Pitch",
    district: "Sergeli",
    address: "Yangi Sergeli, 12-mavze",
    lat: 41.2278, lng: 69.2147,
    images: BERNABEU,
    rating: 4.5, reviews: 87,
    pricePerHourDay: 180000, pricePerHourNight: 240000,
    facilities: ["dressing", "parking", "lights", "artificial"],
    size: "5x5",
    description: "Sergeli markazidagi ochiq mini futbol maydoni.",
    bookedToday: [11, 17, 21, 22],
    addons: { referee: false, video: false, balls: true, bibs: true },
  },
  {
    id: "chilonzor-stadium",
    name: "Chilonzor Stadium",
    district: "Chilonzor",
    address: "Bunyodkor shoh ko'chasi 45",
    lat: 41.2756, lng: 69.2049,
    images: ALLIANZ,
    rating: 4.9, reviews: 213,
    pricePerHourDay: 320000, pricePerHourNight: 450000,
    facilities: ["shower", "dressing", "parking", "lights", "natural", "cafe", "wifi"],
    size: "8x8",
    description: "Tabiiy maysali professional stadion — tibbiy yordam va videoga olish xizmatlari mavjud.",
    bookedToday: [8, 12, 16, 19, 20, 21],
    addons: { referee: true, video: true, balls: true, bibs: true },
  },
  {
    id: "mirzo-arena",
    name: "Mirzo Ulug'bek Arena",
    district: "Mirzo Ulug'bek",
    address: "Mustaqillik shoh ko'chasi 174",
    lat: 41.3349, lng: 69.3437,
    images: CAMPNOU,
    rating: 4.6, reviews: 156,
    pricePerHourDay: 220000, pricePerHourNight: 300000,
    facilities: ["shower", "dressing", "parking", "lights", "artificial", "wifi"],
    size: "7x7",
    description: "Yashil hududda joylashgan zamonaviy stadion.",
    bookedToday: [10, 13, 18, 19],
    addons: { referee: true, video: false, balls: true, bibs: true },
  },
  {
    id: "yashnobod-field",
    name: "Yashnobod Field",
    district: "Yashnobod",
    address: "Tuzel-1, Yashnobod tumani",
    lat: 41.3091, lng: 69.3392,
    images: ANFIELD,
    rating: 4.3, reviews: 64,
    pricePerHourDay: 160000, pricePerHourNight: 220000,
    facilities: ["dressing", "parking", "lights", "artificial"],
    size: "5x5",
    description: "Hamyonbop mini futbol maydoni.",
    bookedToday: [15, 16, 20],
    addons: { referee: false, video: false, balls: false, bibs: true },
  },
  {
    id: "shayxontohur-club",
    name: "Shayxontohur Football Club",
    district: "Shayxontohur",
    address: "Navoi ko'chasi 30",
    lat: 41.3236, lng: 69.2410,
    images: OLDTRAFFORD,
    rating: 4.7, reviews: 198,
    pricePerHourDay: 280000, pricePerHourNight: 380000,
    facilities: ["shower", "dressing", "parking", "lights", "artificial", "cafe", "wifi"],
    size: "6x6",
    description: "Markazda joylashgan zamonaviy klub.",
    bookedToday: [9, 17, 18, 21, 22],
    addons: { referee: true, video: true, balls: true, bibs: true },
  },
  {
    id: "olmazor-pitch",
    name: "Olmazor Pitch",
    district: "Olmazor",
    address: "Qorasaroy ko'chasi 88",
    lat: 41.3502, lng: 69.2238,
    images: MARACANA,
    rating: 4.4, reviews: 72,
    pricePerHourDay: 170000, pricePerHourNight: 230000,
    facilities: ["dressing", "parking", "lights", "artificial"],
    size: "5x5",
    description: "Tinch hududdagi qulay maydon.",
    bookedToday: [14, 19, 20],
    addons: { referee: false, video: false, balls: true, bibs: false },
  },
  {
    id: "mirobod-arena",
    name: "Mirobod Premium Arena",
    district: "Mirobod",
    address: "Oybek ko'chasi 22",
    lat: 41.2925, lng: 69.2786,
    images: SANSIRO,
    rating: 4.9, reviews: 245,
    pricePerHourDay: 380000, pricePerHourNight: 520000,
    facilities: ["shower", "dressing", "parking", "lights", "natural", "cafe", "wifi"],
    size: "11x11",
    description: "Toshkentdagi eng yaxshi tabiiy maysali to'liq o'lchamli stadion.",
    bookedToday: [10, 11, 16, 17, 18, 19, 20, 21],
    addons: { referee: true, video: true, balls: true, bibs: true },
  },
];

export const formatUZS = (n: number) =>
  new Intl.NumberFormat("ru-RU").format(n) + " so'm";
