/** Nguyên liệu và công thức (Phase 7). Giá bán theo bảng phấn trên quầy; cân bằng lại ở Phase 22. */
export interface Ingredient { id: string; name: string; unit: string; icon: string; start: number; low: number }
export interface BrewStep { label: string; /** thời gian kim chạy hết một lượt (giây) */ period: number }
export interface Recipe {
  id: string; name: string; price: number; icon: string;
  needs: Record<string, number>;
  steps: BrewStep[];
  /** Cấp uy tín cần để mở món (Phase 11). Không ghi = có từ đầu. */
  level?: number;
}

export const INGREDIENTS: Ingredient[] = [
  { id: "beans", name: "Cà phê hạt", unit: "g", icon: "ing_beans", start: 500, low: 100 },
  { id: "condensed", name: "Sữa đặc", unit: "ml", icon: "ing_condensed", start: 400, low: 90 },
  { id: "milk", name: "Sữa tươi", unit: "ml", icon: "ing_milk", start: 0, low: 100 },
  { id: "sugar", name: "Đường", unit: "g", icon: "ing_sugar", start: 500, low: 60 },
  { id: "ice", name: "Đá viên", unit: "viên", icon: "ing_ice", start: 80, low: 16 },
  { id: "tea", name: "Trà", unit: "g", icon: "ing_tea", start: 200, low: 40 },
  { id: "kumquat", name: "Tắc", unit: "quả", icon: "ing_kumquat", start: 30, low: 9 },
  { id: "cup", name: "Ly nhựa", unit: "cái", icon: "ing_cup", start: 50, low: 10 },
];

export const RECIPES: Recipe[] = [
  { id: "den", name: "Cà phê đen", price: 25_000, icon: "drink_den", needs: { beans: 20, sugar: 10, ice: 4, cup: 1 },
    steps: [{ label: "Cho cà phê vào phin", period: 1.9 }, { label: "Rót nước sôi", period: 1.7 }, { label: "Chờ cà phê nhỏ giọt", period: 1.5 }, { label: "Thêm đường và đá", period: 1.4 }] },
  { id: "sua", name: "Cà phê sữa", price: 25_000, icon: "drink_sua", needs: { beans: 20, condensed: 30, ice: 4, cup: 1 },
    steps: [{ label: "Cho sữa đặc vào ly", period: 1.9 }, { label: "Cho cà phê vào phin", period: 1.7 }, { label: "Rót nước sôi, chờ nhỏ giọt", period: 1.5 }, { label: "Khuấy đều, thêm đá", period: 1.4 }] },
  { id: "tratac", name: "Trà tắc", price: 20_000, icon: "drink_tratac", needs: { tea: 8, kumquat: 3, sugar: 15, ice: 5, cup: 1 },
    steps: [{ label: "Pha trà", period: 1.9 }, { label: "Vắt tắc", period: 1.7 }, { label: "Thêm đường", period: 1.5 }, { label: "Lắc với đá", period: 1.4 }] },
  { id: "bacxiu", name: "Bạc xỉu", price: 28_000, icon: "drink_bacxiu", needs: { beans: 10, condensed: 30, milk: 60, ice: 4, cup: 1 }, level: 2,
    steps: [{ label: "Cho sữa đặc vào ly", period: 1.8 }, { label: "Rót sữa tươi", period: 1.6 }, { label: "Thêm chút cà phê", period: 1.4 }, { label: "Khuấy nhẹ, thêm đá", period: 1.3 }] },
  { id: "tradao", name: "Trà đào", price: 25_000, icon: "drink_tradao", needs: { tea: 8, sugar: 15, ice: 5, cup: 1 }, level: 3,
    steps: [{ label: "Pha trà", period: 1.8 }, { label: "Thêm đường", period: 1.6 }, { label: "Lắc với đá", period: 1.4 }, { label: "Rót ra ly", period: 1.3 }] },
];

export const QUALITY = ["", "Tạm được", "Ngon", "Tuyệt hảo"] as const;
export const READY_MAX = 6;

/** Gói bán ở Tạp hoá Cô Ba (Phase 9): mỗi gói thêm `amount` đơn vị vào kho với giá gốc `price`. */
export interface Pack { id: string; label: string; amount: number; price: number }
export const PACKS: Pack[] = [
  { id: "beans", label: "Gói 500 g", amount: 500, price: 60_000 },
  { id: "condensed", label: "Hộp 380 ml", amount: 380, price: 25_000 },
  { id: "milk", label: "Hộp 1 lít", amount: 1000, price: 28_000 },
  { id: "sugar", label: "Gói 1 kg", amount: 1000, price: 20_000 },
  { id: "ice", label: "Bịch 40 viên", amount: 40, price: 10_000 },
  { id: "tea", label: "Gói 100 g", amount: 100, price: 30_000 },
  { id: "kumquat", label: "Bịch 20 quả", amount: 20, price: 15_000 },
  { id: "cup", label: "Lốc 50 cái", amount: 50, price: 25_000 },
];
export const SHOP_OPEN = 6 * 60;
export const SHOP_CLOSE = 21 * 60;

/** Giá một gói trong ngày: lệch tối đa ±15% giá gốc, cố định theo số ngày, làm tròn 500đ. Ngày 1 = giá gốc. */
export function packPrice(p: Pack, day: number): number {
  if (day <= 1) return p.price;
  let t = (day * 2654435761 + p.id.charCodeAt(0) * 97 + p.id.length * 7919) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296; // 0–1
  return Math.max(500, Math.round((p.price * (0.85 + r * 0.3)) / 500) * 500);
}
