/** Nguyên liệu và công thức (Phase 7). Giá bán theo bảng phấn trên quầy; cân bằng lại ở Phase 22. */
export interface Ingredient { id: string; name: string; unit: string; icon: string; start: number; low: number }
export interface BrewStep { label: string; /** thời gian kim chạy hết một lượt (giây) */ period: number }
export interface Recipe {
  id: string; name: string; price: number; icon: string;
  needs: Record<string, number>;
  steps: BrewStep[];
  /** Có giá trị = món chưa mở (ghi điều kiện mở). */
  locked?: string;
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
  { id: "bacxiu", name: "Bạc xỉu", price: 28_000, icon: "drink_bacxiu", needs: { beans: 10, condensed: 30, milk: 60, ice: 4, cup: 1 }, steps: [], locked: "Mở khi quán được biết đến" },
  { id: "tradao", name: "Trà đào", price: 25_000, icon: "drink_tradao", needs: { tea: 8, sugar: 15, ice: 5, cup: 1 }, steps: [], locked: "Mở khi quán quen thuộc" },
];

export const QUALITY = ["", "Tạm được", "Ngon", "Tuyệt hảo"] as const;
export const READY_MAX = 6;
