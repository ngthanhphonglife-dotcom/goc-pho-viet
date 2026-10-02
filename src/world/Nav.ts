/**
 * Lưới đi lại trên vỉa hè (Phase 4): vật cản là các hình chữ nhật quanh chân đạo cụ/người đứng.
 * - blocked(): kiểm tra va chạm khi điều khiển bằng joystick/phím (trượt dọc mép vật cản).
 * - findPath(): A* trên lưới ô nhỏ cho "chạm để đi".
 */
export interface Box { x0: number; y0: number; x1: number; y1: number }
export interface Pt { x: number; y: number }

const CELL = 30;
/** Nửa bề ngang thân người (nới vật cản ra để không đi sát quá). */
const BODY = 30;

export class NavGrid {
  private cols: number;
  private rows: number;
  private grid: Uint8Array;
  private boxes: Box[];

  constructor(readonly area: Box, obstacles: Box[]) {
    this.boxes = obstacles.map((b) => ({ x0: b.x0 - BODY, y0: b.y0 - 4, x1: b.x1 + BODY, y1: b.y1 + 4 }));
    this.cols = Math.ceil((area.x1 - area.x0) / CELL) + 1;
    this.rows = Math.ceil((area.y1 - area.y0) / CELL) + 1;
    this.grid = new Uint8Array(this.cols * this.rows);
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const p = this.center(c, r);
      this.grid[r * this.cols + c] = this.blocked(p.x, p.y) ? 1 : 0;
    }
  }

  clamp(p: Pt): Pt {
    return { x: Math.min(this.area.x1, Math.max(this.area.x0, p.x)), y: Math.min(this.area.y1, Math.max(this.area.y0, p.y)) };
  }

  /** Điểm (x, y) có nằm ngoài vỉa hè hoặc trong vật cản không. */
  blocked(x: number, y: number): boolean {
    const a = this.area;
    if (x < a.x0 || x > a.x1 || y < a.y0 || y > a.y1) return true;
    for (const b of this.boxes) if (x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1) return true;
    return false;
  }

  private center(c: number, r: number): Pt {
    return { x: Math.min(this.area.x1, this.area.x0 + c * CELL), y: Math.min(this.area.y1, this.area.y0 + r * CELL) };
  }

  private cellOf(p: Pt): [number, number] {
    return [Math.min(this.cols - 1, Math.max(0, Math.round((p.x - this.area.x0) / CELL))), Math.min(this.rows - 1, Math.max(0, Math.round((p.y - this.area.y0) / CELL)))];
  }

  /** Ô trống gần nhất (loang theo vòng). */
  private nearestFree(c: number, r: number): [number, number] | null {
    for (let d = 0; d < Math.max(this.cols, this.rows); d++)
      for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== d) continue;
        const cc = c + dc, rr = r + dr;
        if (cc >= 0 && rr >= 0 && cc < this.cols && rr < this.rows && !this.grid[rr * this.cols + cc]) return [cc, rr];
      }
    return null;
  }

  /** Điểm đứng được gần nhất với p. */
  free(p: Pt): Pt {
    const q = this.clamp(p);
    if (!this.blocked(q.x, q.y)) return q;
    const [c, r] = this.cellOf(q);
    const n = this.nearestFree(c, r);
    return n ? this.center(n[0], n[1]) : q;
  }

  /** Đoạn thẳng a→b có thông không (lấy mẫu mỗi 10 đơn vị). */
  clear(a: Pt, b: Pt): boolean {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 10);
    for (let i = 1; i <= n; i++) if (this.blocked(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return false;
    return true;
  }

  /** Đường đi từ a tới b (đã rút gọn các điểm thẳng hàng nhìn thấy nhau). Rỗng nếu không tới được. */
  findPath(a: Pt, b: Pt): Pt[] {
    const goal = this.free(b);
    if (this.clear(a, goal)) return [goal];
    const s = this.nearestFree(...this.cellOf(this.clamp(a)));
    const g = this.nearestFree(...this.cellOf(goal));
    if (!s || !g) return [];
    const N = this.cols * this.rows;
    const start = s[1] * this.cols + s[0], end = g[1] * this.cols + g[0];
    const cost = new Float32Array(N).fill(Infinity);
    const from = new Int32Array(N).fill(-1);
    const open: number[] = [start];
    const f = new Float32Array(N).fill(Infinity);
    const h = (i: number) => Math.hypot((i % this.cols) - g[0], Math.floor(i / this.cols) - g[1]);
    cost[start] = 0;
    f[start] = h(start);
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (cur === end) break;
      const cc = cur % this.cols, cr = Math.floor(cur / this.cols);
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = cc + dc, nr = cr + dr;
        if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) continue;
        const ni = nr * this.cols + nc;
        if (this.grid[ni]) continue;
        // không cắt chéo qua góc vật cản
        if (dr && dc && (this.grid[cr * this.cols + nc] || this.grid[nr * this.cols + cc])) continue;
        const nd = cost[cur] + (dr && dc ? 1.4142 : 1);
        if (nd < cost[ni]) {
          if (cost[ni] === Infinity) open.push(ni);
          cost[ni] = nd;
          from[ni] = cur;
          f[ni] = nd + h(ni);
        }
      }
    }
    if (from[end] === -1 && end !== start) return [];
    const pts: Pt[] = [goal];
    for (let i = end; i !== -1; i = from[i]) pts.push(this.center(i % this.cols, Math.floor(i / this.cols)));
    pts.reverse();
    // rút gọn: bỏ điểm giữa nếu hai đầu nhìn thấy nhau
    const out: Pt[] = [];
    let cur = a;
    let i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.clear(cur, pts[j])) j--;
      out.push(pts[j]);
      cur = pts[j];
      i = j + 1;
    }
    return out;
  }
}
