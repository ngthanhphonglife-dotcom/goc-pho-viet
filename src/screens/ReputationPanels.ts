import { MAX_LEVEL, REP_LEVELS, currentLevel, levelInfo, progress } from "../core/Reputation";
import { ICONS, button, el, img } from "./dom";
import { Modal } from "./screens";

/** Bảng Uy tín: cấp hiện tại, tiến độ tới cấp sau, 5 cấp và những gì mở ra. */
export class ReputationPanel extends Modal {
  constructor(host: HTMLElement) { super(host, "Uy tín của quán", "Reputation"); }

  show(s: { reputation: number; repLevel?: number }): void {
    this.body.replaceChildren();
    const lv = currentLevel(s), info = levelInfo(lv), p = progress(s);
    const head = el("div", "rep-head", this.body);
    const badge = el("div", "rep-badge", head);
    img(ICONS + "icon_star.svg", "", badge);
    el("strong", "", badge, String(lv));
    const t = el("div", "rep-headtxt", head);
    el("strong", "rep-name", t, `Lv.${lv} — ${info.name}`);
    el("span", "rep-points", t, `${s.reputation} điểm uy tín`).dataset.rep = "points";
    const bar = el("div", "rep-bar", this.body);
    bar.dataset.rep = "bar";
    el("i", "", bar).style.width = Math.round(p.ratio * 100) + "%";
    el("p", "rep-next", this.body, p.next ? `Còn ${p.missing} điểm nữa lên Lv.${p.next.level} — ${p.next.name}` : "Quán đã đạt cấp uy tín cao nhất!").dataset.rep = "next";
    const list = el("div", "rep-list", this.body);
    for (const l of REP_LEVELS) {
      const row = el("div", "rep-row" + (l.level <= lv ? " got" : "") + (l.level === lv ? " now" : ""), list);
      row.dataset.level = String(l.level);
      el("span", "rep-lv", row, l.level <= lv ? "✓" : "🔒");
      const c = el("div", "rep-rowtxt", row);
      el("strong", "", c, `Lv.${l.level} — ${l.name}` + (l.need ? ` (${l.need} điểm)` : ""));
      el("span", "", c, l.unlocks.join(" · "));
    }
    el("p", "note", this.body, "Khách hài lòng thì uy tín tăng; khách bỏ đi vì chờ lâu thì uy tín giảm. Cấp đã đạt không bị tụt.");
    const row = el("div", "modal-actions", this.body);
    button("primary", row, "Đóng", () => this.close()).dataset.panel = "close";
    this.open();
  }
}

/** Bảng Lên cấp uy tín. */
export class LevelUpPanel extends Modal {
  constructor(host: HTMLElement) { super(host, "Lên cấp uy tín!", "LevelUp"); }

  show(level: number): Promise<void> {
    this.body.replaceChildren();
    const info = levelInfo(level);
    const badge = el("div", "rep-badge big", this.body);
    img(ICONS + "icon_star.svg", "", badge);
    el("strong", "", badge, String(level));
    el("strong", "q-title center", this.body, `Lv.${level} — ${info.name}`);
    el("p", "intro", this.body, level >= MAX_LEVEL ? "Quán của bạn đã nổi tiếng nhất phố Hoa Sữa!" : "Bà con khu phố ngày càng quý quán của bạn. Vừa mở thêm:");
    const ul = el("ul", "q-steps", this.body);
    for (const u of info.unlocks) { const li = el("li", "ok", ul); el("span", "tick", li, "✓"); el("span", "", li, u); }
    return new Promise((resolve) => {
      let answered = false;
      const done = () => { if (answered) return; answered = true; this.onClose = null; this.close(); resolve(); };
      const row = el("div", "modal-actions", this.body);
      button("primary", row, "Tuyệt!", done).dataset.panel = "ok";
      this.onClose = done;
      this.open();
    });
  }
}
