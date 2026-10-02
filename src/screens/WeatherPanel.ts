import type { GameStateData } from "../core/GameState";
import { KIND_LABEL, KIND_NOTE, SLOTS, forecast, iconOf, slotOf, temperature, type WeatherKind } from "../core/weather";
import { ICONS, el, img } from "./dom";
import { Modal } from "./screens";

/** Bảng "Dự báo hôm nay" (Phase 5): 3 buổi của ngày, buổi hiện tại được tô nổi. */
export class WeatherPanel extends Modal {
  constructor(host: HTMLElement) {
    super(host, "Dự báo hôm nay", "WeatherForecast");
  }

  show(s: Readonly<GameStateData>, current: WeatherKind): void {
    this.body.replaceChildren();
    const kinds = forecast(s.day);
    const now = slotOf(s.minuteOfDay);
    const list = el("div", "start-values", this.body);
    SLOTS.forEach((slot, i) => {
      const k = i === now ? current : kinds[i];
      const mid = (slot.from + slot.to) / 2;
      const r = el("div", "sv-row" + (i === now ? " now" : ""), list);
      r.dataset.slot = String(i);
      img(ICONS + "icon_weather_" + iconOf(k, mid) + ".svg", "icon", r);
      const lab = el("span", "sv-label", r);
      el("strong", "", lab, slot.name);
      el("span", "", lab, ` ${String(slot.from / 60).padStart(2, "0")}:00–${String(slot.to / 60).padStart(2, "0")}:00`);
      el("strong", "sv-value", r, `${KIND_LABEL[k]} · ${temperature(mid, k)}°C`);
    });
    el("p", "intro", this.body, KIND_NOTE[current]);
    el("p", "note", this.body, "Thời tiết sẽ ảnh hưởng tới lượng khách và món bán chạy ở các phase sau.");
    this.open();
  }
}
