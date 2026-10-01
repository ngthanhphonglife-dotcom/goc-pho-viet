// Hàm dựng DOM nhỏ dùng chung cho các màn hình Phase 1.

export const ICONS = import.meta.env.BASE_URL + "art/icons/";
export const UI_ART = import.meta.env.BASE_URL + "art/ui/";

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, parent?: HTMLElement, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

export function img(src: string, cls: string, parent: HTMLElement, alt = ""): HTMLImageElement {
  const i = el("img", cls, parent);
  i.src = src;
  i.alt = alt;
  i.draggable = false;
  return i;
}

export function button(cls: string, parent: HTMLElement, label: string, onClick: () => void): HTMLButtonElement {
  const b = el("button", "btn " + cls, parent);
  b.type = "button";
  el("span", "t", b, label);
  b.addEventListener("click", () => { if (!b.disabled) onClick(); });
  b.addEventListener("pointerdown", () => b.classList.add("pressed"));
  for (const ev of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(ev, () => b.classList.remove("pressed"));
  return b;
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
