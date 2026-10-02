/**
 * Lớp điều khiển (Phase 4): joystick góc dưới trái + nút tương tác góc dưới phải.
 * Nằm dưới Master UI (popup che được), phía trên thanh điều hướng dưới — không đổi bố cục Master UI.
 */
export class Controls {
  readonly root: HTMLElement;
  private stick: HTMLElement;
  private knob: HTMLElement;
  private btn: HTMLButtonElement;
  private label: HTMLElement;
  private vecFn: (x: number, y: number) => void = () => {};
  private actFn: () => void = () => {};
  private pointer: number | null = null;
  vector = { x: 0, y: 0 };

  constructor(host: HTMLElement) {
    this.root = host;
    host.dataset.name = "Controls";
    this.stick = document.createElement("div");
    this.stick.className = "joystick";
    this.stick.dataset.name = "Joystick";
    this.stick.setAttribute("aria-label", "Cần điều khiển di chuyển");
    this.stick.innerHTML = '<i class="ar l"></i><i class="ar r"></i><i class="ar u"></i><i class="ar d"></i>';
    this.knob = document.createElement("div");
    this.knob.className = "knob";
    this.stick.appendChild(this.knob);
    this.btn = document.createElement("button");
    this.btn.type = "button";
    this.btn.className = "interact";
    this.btn.dataset.name = "InteractButton";
    this.btn.hidden = true;
    this.btn.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 10h32a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H22l-9 8v-8H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" fill="#fff" stroke="#4B2E2E" stroke-width="3" stroke-linejoin="round"/><circle cx="16" cy="22" r="3" fill="#AE1C3F"/><circle cx="24" cy="22" r="3" fill="#AE1C3F"/><circle cx="32" cy="22" r="3" fill="#AE1C3F"/></svg>';
    this.label = document.createElement("span");
    this.btn.appendChild(this.label);
    host.append(this.stick, this.btn);

    const set = (e: PointerEvent) => {
      const r = this.stick.getBoundingClientRect();
      const rad = r.width / 2;
      let x = (e.clientX - (r.left + rad)) / (rad * 0.62), y = (e.clientY - (r.top + rad)) / (rad * 0.62);
      const m = Math.hypot(x, y);
      if (m > 1) { x /= m; y /= m; }
      this.emit(x, y);
    };
    this.stick.addEventListener("pointerdown", (e) => {
      if (this.pointer !== null) return;
      this.pointer = e.pointerId;
      try { this.stick.setPointerCapture(e.pointerId); } catch { /* bỏ qua */ }
      this.stick.classList.add("on");
      set(e);
      e.preventDefault();
    });
    this.stick.addEventListener("pointermove", (e) => { if (e.pointerId === this.pointer) set(e); });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.pointer) return;
      this.pointer = null;
      this.stick.classList.remove("on");
      this.emit(0, 0);
    };
    this.stick.addEventListener("pointerup", end);
    this.stick.addEventListener("pointercancel", end);
    this.btn.addEventListener("click", () => this.actFn());
  }

  private emit(x: number, y: number): void {
    this.vector = { x, y };
    this.knob.style.transform = `translate(${x * 31}%, ${y * 31}%)`;
    this.vecFn(x, y);
  }

  onVector(fn: (x: number, y: number) => void): void { this.vecFn = fn; }
  onInteract(fn: () => void): void { this.actFn = fn; }

  /** Hiện nút tương tác với tên đối tượng ở gần; null = ẩn. */
  setInteract(name: string | null): void {
    this.btn.hidden = !name;
    if (name && this.label.textContent !== name) this.label.textContent = name;
  }

  /** Thả joystick (khi rời game / mở bảng). */
  reset(): void {
    this.pointer = null;
    this.stick.classList.remove("on");
    this.emit(0, 0);
  }
}
