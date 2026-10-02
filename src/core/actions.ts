// 12 hành động trên Master UI. Phase 0: mọi nút mở popup "Sẽ có ở Phase X".
// Các phase sau đăng ký handler thật qua MasterUI.onAction().

export type ActionId =
  | "map" | "quests" | "inventory" | "shop"
  | "settings" | "addMoney" | "weather"
  | "stall" | "ingredients" | "sell" | "upgrade" | "decorate";

export interface ActionInfo {
  id: ActionId;
  /** Tiêu đề popup. */
  title: string;
  /** Nhãn trên nút (nếu khác tiêu đề). */
  label: string;
  icon: string;
  phase: string;
  description: string;
}

export const ACTIONS: Record<ActionId, ActionInfo> = {
  map: { id: "map", title: "Bản đồ khu phố", label: "Bản đồ", icon: "icon_map", phase: "Phase 17",
    description: "Xem các khu phố và mở khoá địa điểm mới (Trường học, Chợ, Công viên, Bờ sông) khi đủ uy tín." },
  quests: { id: "quests", title: "Nhiệm vụ", label: "Nhiệm vụ", icon: "icon_quest", phase: "Phase 6",
    description: "Danh sách nhiệm vụ chính, nhiệm vụ phụ và phần thưởng khi hoàn thành." },
  inventory: { id: "inventory", title: "Túi đồ", label: "Túi đồ", icon: "icon_bag", phase: "Phase 16",
    description: "Nguyên liệu, đồ dùng và đồ trang trí bạn đang có." },
  shop: { id: "shop", title: "Cửa hàng Cô Ba", label: "Cửa hàng", icon: "icon_shop", phase: "Phase 9",
    description: "Mua nguyên liệu, thiết bị và đồ trang trí cho quầy." },
  settings: { id: "settings", title: "Cài đặt", label: "Cài đặt", icon: "icon_settings", phase: "Phase 1",
    description: "Âm nhạc, hiệu ứng, rung và lưu game." },
  addMoney: { id: "addMoney", title: "Mua nhanh", label: "Mua nhanh", icon: "icon_money", phase: "Phase 9",
    description: "Đi tới cửa hàng để mua nhanh nguyên liệu bằng tiền trong game (không dùng tiền thật)." },
  weather: { id: "weather", title: "Thời tiết", label: "Thời tiết", icon: "icon_weather_sun", phase: "Phase 5",
    description: "Nắng, mây, mưa thay đổi trong ngày và ảnh hưởng lượng khách." },
  stall: { id: "stall", title: "Quầy hàng", label: "Quầy hàng", icon: "icon_stall", phase: "Phase 7",
    description: "Quản lý quầy: thực đơn, giá bán và bố trí." },
  ingredients: { id: "ingredients", title: "Nguyên liệu", label: "Nguyên liệu", icon: "icon_ingredients", phase: "Phase 7",
    description: "Kiểm tra nguyên liệu còn lại để pha chế." },
  sell: { id: "sell", title: "Bán hàng", label: "Bán hàng", icon: "icon_sell", phase: "Phase 8",
    description: "Nhận đơn, pha chế và giao cho khách." },
  upgrade: { id: "upgrade", title: "Nâng cấp quầy", label: "Nâng cấp", icon: "icon_upgrade", phase: "Phase 12",
    description: "Nâng cấp từ xe cà phê lên quầy lớn, rồi quán nhỏ." },
  decorate: { id: "decorate", title: "Trang trí", label: "Trang trí", icon: "icon_decor", phase: "Phase 13",
    description: "Đặt bàn ghế, cây xanh, bảng menu cho quán." },
};
