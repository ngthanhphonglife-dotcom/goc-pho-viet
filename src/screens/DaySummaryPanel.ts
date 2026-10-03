import { summarize, type DayRecord } from "../core/DayStats";
import { formatMoney, weekdayOf, type GameStateData } from "../core/GameState";
import { RECIPES } from "../data/items";
import { button, el, img } from "./dom";
import { Modal } from "./screens";

const ITEMS = import.meta.env.BASE_URL + "art/items/";
const signed = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + formatMoney(Math.abs(n));

/** Bảng Tổng kết ngày (Phase 10). Trả về "next" (sang ngày mới) hoặc "stay" (bán tiếp — chỉ khi kết thúc sớm). */
export class DaySummaryPanel extends Modal {
  constructor(host: HTMLElement) { super(host, "Tổng kết ngày", "DaySummary"); }

  show(s: Readonly<GameStateData>, early: boolean): Promise<"next" | "stay"> {
    const d = summarize(s);
    this.body.replaceChildren();
    el("strong", "q-title center", this.body, `Ngày ${s.day} · ${weekdayOf(s.day)}`);

    const money = el("div", "sum-money", this.body);
    const line = (label: string, value: string, cls = "", key = "") => {
      const r = el("div", "sum-line " + cls, money);
      if (key) r.dataset.sum = key;
      el("span", "", r, label);
      el("strong", "", r, value);
    };
    line("Doanh thu", formatMoney(d.revenue), "", "revenue");
    line("Tiền tip", formatMoney(d.tips), "", "tips");
    line("Chi phí nguyên liệu", d.cost ? "−" + formatMoney(d.cost) : formatMoney(0), "cost", "cost");
    line("Lợi nhuận", signed(d.profit), "profit " + (d.profit >= 0 ? "pos" : "neg"), "profit");

    const tiles = el("div", "sum-tiles", this.body);
    const tile = (key: string, value: string, label: string) => {
      const t = el("div", "sum-tile", tiles);
      t.dataset.sum = key;
      el("strong", "", t, value);
      el("span", "", t, label);
    };
    tile("cups", String(d.cups), "ly đã bán");
    tile("satisfaction", d.satisfaction === null ? "—" : d.satisfaction + "%", "khách hài lòng");
    tile("lost", String(d.lost), "khách bỏ đi");
    tile("rep", (d.repDelta > 0 ? "+" : "") + d.repDelta, "uy tín");

    if (d.best) {
      const r = RECIPES.find((x) => x.id === d.best)!;
      const b = el("div", "sum-best", this.body);
      b.dataset.sum = "best";
      img(ITEMS + r.icon + ".svg", "", b, r.name);
      el("span", "", b, "Bán chạy nhất: ");
      el("strong", "", b, `${r.name} (${s.today!.byRecipe![r.id]} ly)`);
    }

    // biểu đồ số ly theo giờ (06h–24h)
    this.chart("Số ly theo giờ", "hours", d.byHour.map((v, i) => ({ v, label: i % 3 === 0 ? `${6 + i}h` : "", title: `${6 + i}h: ${v} ly` })), false);
    // lợi nhuận 7 ngày gần nhất (kể cả hôm nay)
    const hist: DayRecord[] = [...(s.history ?? []), d].slice(-7);
    if (hist.length > 1) this.chart("Lợi nhuận các ngày gần đây", "history", hist.map((h) => ({ v: h.profit, label: "N" + h.day, title: `Ngày ${h.day}: ${signed(h.profit)}` })), true);

    el("p", "note", this.body, d.cups === 0 ? "Hôm nay chưa bán được ly nào. Mai mở quầy sớm đón khách nhé!" : d.profit >= 0 ? "Một ngày có lãi. Nghỉ ngơi thôi, mai bán tiếp!" : "Hôm nay nhập hàng nhiều hơn bán. Kho đầy rồi, mai sẽ khá hơn!");

    return new Promise((resolve) => {
      let answered = false;
      const done = (v: "next" | "stay") => { if (answered) return; answered = true; this.onClose = null; this.close(); resolve(v); };
      const row = el("div", "modal-actions", this.body);
      if (early) button("", row, "Bán tiếp", () => done("stay")).dataset.panel = "stay";
      button("primary", row, "Sang ngày mới", () => done("next")).dataset.panel = "next";
      // đóng bằng X: kết thúc sớm = bán tiếp; hết ngày thật = sang ngày mới
      this.onClose = () => done(early ? "stay" : "next");
      this.open();
    });
  }

  private chart(title: string, key: string, bars: { v: number; label: string; title: string }[], signedBars: boolean): void {
    const box = el("div", "sum-chart", this.body);
    box.dataset.sum = key;
    el("span", "sum-chart-title", box, title);
    const max = Math.max(1, ...bars.map((b) => Math.abs(b.v)));
    const row = el("div", "sum-bars", box);
    for (const b of bars) {
      const col = el("div", "sum-bar", row);
      col.title = b.title;
      const fill = el("i", signedBars && b.v < 0 ? "neg" : "", col);
      fill.style.height = (b.v === 0 ? 0 : Math.max(6, (Math.abs(b.v) / max) * 100)).toFixed(0) + "%";
      fill.dataset.v = String(b.v);
      el("span", "", col, b.label);
    }
  }
}
