import { INGREDIENTS, READY_MAX, RECIPES, type Recipe } from "../data/items";
import type { GameState } from "./GameState";

/** Kho nguyên liệu + khay ly pha sẵn (Phase 7). */
export class Business {
  constructor(private state: GameState) {}

  /** Save cũ / ván mới chưa có kho → cấp kho khởi đầu. */
  ensure(): void {
    const s = this.state.value;
    if (s.stock && s.ready) return;
    this.state.patchQuiet({ stock: s.stock ?? Object.fromEntries(INGREDIENTS.map((i) => [i.id, i.start])), ready: s.ready ?? [] });
  }

  stock(id: string): number { this.ensure(); return this.state.value.stock![id] ?? 0; }
  get ready() { this.ensure(); return this.state.value.ready!; }
  get readyFull(): boolean { return this.ready.length >= READY_MAX; }
  recipe(id: string): Recipe { return RECIPES.find((r) => r.id === id)!; }

  /** Còn pha được mấy ly món này. */
  canMake(r: Recipe): number {
    if (r.locked) return 0;
    return Math.min(...Object.entries(r.needs).map(([id, n]) => Math.floor(this.stock(id) / n)));
  }

  status(id: string): "ok" | "low" | "out" {
    const i = INGREDIENTS.find((x) => x.id === id)!;
    const n = this.stock(id);
    return n <= 0 ? "out" : n <= i.low ? "low" : "ok";
  }

  /** Trừ nguyên liệu cho một ly (pha theo đơn, không qua khay). */
  consume(r: Recipe): boolean {
    if (this.canMake(r) < 1) return false;
    this.state.update((s) => { for (const [id, n] of Object.entries(r.needs)) s.stock![id] -= n; });
    return true;
  }

  /** Lấy ly ngon nhất của món này trên khay. Trả về chất lượng, hoặc null nếu khay không có. */
  takeReady(recipe: string): number | null {
    const list = this.ready;
    let best = -1;
    list.forEach((c, i) => { if (c.recipe === recipe && (best < 0 || c.quality > list[best].quality)) best = i; });
    if (best < 0) return null;
    const q = list[best].quality;
    this.state.update((s) => { s.ready!.splice(best, 1); });
    return q;
  }

  /** Đặt một ly lên khay (nếu còn chỗ). */
  addReady(recipe: string, quality: number): boolean {
    if (this.readyFull) return false;
    this.state.update((s) => { s.ready!.push({ recipe, quality }); });
    return true;
  }

  /** Pha xong một ly: trừ nguyên liệu, thêm vào khay. Trả về false nếu thiếu nguyên liệu hoặc khay đầy. */
  finishBrew(r: Recipe, quality: number): boolean {
    if (this.canMake(r) < 1 || this.readyFull) return false;
    this.state.update((s) => {
      for (const [id, n] of Object.entries(r.needs)) s.stock![id] -= n;
      s.ready!.push({ recipe: r.id, quality });
    });
    return true;
  }
}
