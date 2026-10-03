import { Container, Graphics, Sprite, type Texture } from "pixi.js";

/**
 * Nhân vật có khớp (Phase 3): ghép từ các bộ phận vector, chuyển động bằng xương — không dùng ảnh từng khung,
 * nên mượt ở mọi tốc độ khung hình và sắc nét ở mọi màn hình.
 */

export interface PartCell { x: number; y: number; w: number; h: number; px: number; py: number }
export interface Rig { hipX: number; hipY: number; knee: number; torsoY: number; shoulderX: number; shoulderY: number; headY: number; hand: number; height: number }
export interface CharInfo { id: string; name: string; role: string; file: string; w: number; h: number; scale: number; parts: Record<string, PartCell> }
export interface CharTextures { parts: Record<string, Texture>; faces: Record<string, Texture>; faceCells: Record<string, PartCell>; rs: number }

export type Anim = "idle" | "walk" | "brew" | "serve" | "sit" | "fix" | "wave" | "talk";
export type Expression = "normal" | "happy" | "surprised" | "talk";

/** Tỉ lệ chung của nhân vật so với phố (cân lại sau Phase 8: nhỏ hơn để không che xe cà phê). */
export const CHAR_SCALE = 0.78;

export class Character extends Container {
  readonly info: CharInfo;
  /** Tỉ lệ thật trên phố (học sinh nhỏ hơn người lớn). */
  get size(): number { return this.info.scale * CHAR_SCALE; }
  /** Vị trí chân trên phố (đơn vị thiết kế). */
  wx = 0;
  wy = 0;
  /** 1 = nhìn phải, -1 = nhìn trái. */
  dir: 1 | -1 = 1;
  anim: Anim = "idle";
  expression: Expression = "normal";
  tappable = true;
  /** Đang trò chuyện với người chơi: "speak" = đang nói (động tác nói), "listen" = đứng nghe. null = bình thường. */
  talkMode: "speak" | "listen" | null = null;
  /** Thời gian còn lại của phản ứng khi được chạm (vẫy tay, vui). */
  reacting = 0;
  /** Góc hiện tại của các khớp (rad) — cho test. */
  pose = { thighF: 0, thighB: 0, shinF: 0, shinB: 0, armF: 0, armB: 0, lean: 0, bob: 0, drop: 0 };

  private t = Math.random() * 10;
  private blinkIn = 1 + Math.random() * 3;
  private blink = 0;
  private body = new Container();
  private upperBack = new Container();
  private upperFront = new Container();
  private legF = new Container();
  private legB = new Container();
  private shinF = new Container();
  private shinB = new Container();
  private armF = new Container();
  private armB = new Container();
  private headC = new Container();
  private face = new Sprite();
  private shadow = new Graphics();
  private sprites: { s: Sprite; part: string }[] = [];
  private tex: CharTextures | null = null;

  constructor(info: CharInfo, private rig: Rig) {
    super();
    this.info = info;
    this.label = "char:" + info.id;
    const r = rig;
    const mk = (part: string, parent: Container) => {
      const s = new Sprite();
      this.sprites.push({ s, part });
      parent.addChild(s);
      return s;
    };
    this.shadow.ellipse(0, 0, 60, 11).fill({ color: 0x000000, alpha: 0.16 });
    this.addChild(this.shadow, this.body);
    // thứ tự vẽ: đồ đeo lưng, tay sau → chân sau, chân trước → thân, đầu, mặt, kính → tay trước (+ đồ cầm)
    this.body.addChild(this.upperBack, this.legB, this.legF, this.upperFront);
    if (info.parts.back) mk("back", this.upperBack).position.set(0, r.torsoY);
    this.upperBack.addChild(this.armB);
    mk("arm", this.armB);
    for (const [leg, shin] of [[this.legB, this.shinB], [this.legF, this.shinF]] as const) {
      mk("thigh", leg);
      leg.addChild(shin);
      shin.position.set(0, r.knee);
      mk("shin", shin);
    }
    mk("torso", this.upperFront).position.set(0, r.torsoY);
    this.upperFront.addChild(this.headC);
    mk("head", this.headC);
    this.headC.addChild(this.face);
    if (info.parts.glasses) mk("glasses", this.headC);
    this.upperFront.addChild(this.armF);
    mk("arm", this.armF);
    if (info.parts.hand) mk("hand", this.armF).position.set(0, r.hand);
    // khớp: thân trên xoay quanh hông
    this.upperBack.pivot.set(0, r.torsoY);
    this.upperFront.pivot.set(0, r.torsoY);
    this.armB.position.set(-r.shoulderX, r.shoulderY);
    this.armF.position.set(r.shoulderX, r.shoulderY);
    this.headC.position.set(0, r.headY);
    this.applyPose(0);
  }

  /** Gắn texture (gọi lại mỗi lần raster theo độ phân giải mới). */
  setTextures(tex: CharTextures): void {
    this.tex = tex;
    const inv = 1 / tex.rs;
    for (const { s, part } of this.sprites) {
      const c = this.info.parts[part];
      s.texture = tex.parts[part];
      s.anchor.set(c.px / c.w, c.py / c.h);
      s.scale.set(inv);
    }
    this.face.scale.set(inv);
    this.setFace("normal");
    this.scale.set(tex.rs * this.size);
    this.place();
  }

  private faceName = "";
  private setFace(name: string): void {
    if (!this.tex || this.faceName === name) return;
    const c = this.tex.faceCells[name];
    this.face.texture = this.tex.faces[name];
    this.face.anchor.set(c.px / c.w, c.py / c.h);
    this.faceName = name;
  }

  get faceShown(): string {
    return this.faceName;
  }

  play(anim: Anim, expression?: Expression): void {
    this.anim = anim;
    if (expression) this.expression = expression;
  }

  /** Phản ứng khi người chơi chạm: vui + vẫy tay. */
  react(seconds = 1.6): void {
    this.reacting = seconds;
  }

  place(): void {
    if (!this.tex) return;
    this.position.set(this.wx * this.tex.rs, this.wy * this.tex.rs);
    this.zIndex = this.wy;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.reacting > 0) this.reacting = Math.max(0, this.reacting - dt);
    // chớp mắt
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) { this.blink = 0.12; this.blinkIn = 2.2 + Math.random() * 3; }
    if (this.blink > 0) this.blink -= dt;
    this.applyPose(this.t);
    this.place();
  }

  private applyPose(t: number): void {
    const r = this.rig;
    const reacting = this.reacting > 0;
    const anim = this.anim;
    const seated = anim === "sit" || anim === "fix";
    const br = Math.sin(t * 2.1);
    let thighF = 0, thighB = 0, shinF = 0, shinB = 0, armF = 0.1 + 0.03 * br, armB = -0.1 - 0.03 * br, lean = 0, bob = br * 1.2, drop = 0, head = 0.02 * Math.sin(t * 1.3);

    if (anim === "walk") {
      const p = t * 8.2;
      thighF = -0.5 * Math.sin(p);
      thighB = 0.5 * Math.sin(p);
      shinF = 0.6 * Math.max(0, Math.sin(p + 2.3));
      shinB = 0.6 * Math.max(0, Math.sin(p + 2.3 + Math.PI));
      armF = 0.45 * Math.sin(p);
      armB = -0.45 * Math.sin(p);
      bob = -3.2 * Math.abs(Math.cos(p));
      lean = 0.05;
    } else if (anim === "brew") {
      armF = -1.25 + 0.22 * Math.sin(t * 9);
      armB = -0.9 + 0.12 * Math.sin(t * 9 + 1.2);
      lean = 0.07;
      head = 0.08;
    } else if (anim === "serve") {
      armF = -1.5 + 0.05 * br;
      armB = -0.25;
      lean = 0.04;
    } else if (seated) {
      thighF = -1.2; thighB = -1.12;
      shinF = 1.2; shinB = 1.12;
      drop = 24;
      armF = -0.45 + 0.04 * br; armB = -0.35;
      if (anim === "fix") {
        lean = 0.2;
        head = 0.1;
        armF = -1.15 + 0.3 * Math.sin(t * 6.5);
        armB = -0.95 + 0.12 * Math.sin(t * 6.5 + 1);
      }
    } else if (anim === "talk") {
      armF = -0.55 + 0.25 * Math.sin(t * 4.2);
    }
    const speaking = this.talkMode === "speak";
    if (speaking && anim !== "fix") armF = (seated ? -0.9 : -0.55) + 0.25 * Math.sin(t * 4.2);
    if (anim === "wave" || reacting) {
      armF = -2.65 + 0.35 * Math.sin(t * 11);
      if (!seated && anim !== "walk") lean = -0.03;
    }

    this.pose = { thighF, thighB, shinF, shinB, armF, armB, lean, bob, drop };
    this.body.scale.x = this.dir;
    this.body.y = drop + bob;
    this.legF.position.set(r.hipX, r.hipY);
    this.legB.position.set(-r.hipX, r.hipY);
    this.legF.rotation = thighF;
    this.legB.rotation = thighB;
    this.shinF.rotation = shinF;
    this.shinB.rotation = shinB;
    for (const u of [this.upperBack, this.upperFront]) {
      u.position.set(0, r.torsoY);
      u.rotation = lean;
      u.scale.y = 1 + 0.012 * br;
    }
    this.armF.rotation = armF;
    this.armB.rotation = armB;
    this.headC.rotation = head;

    // mặt
    let face: string = this.expression;
    if (reacting) face = "happy";
    else if (speaking || (anim === "talk" && !this.talkMode)) face = Math.floor(t / 0.18) % 2 ? "talk" : "normal";
    else if (anim === "serve" || anim === "wave") face = "happy";
    if (this.blink > 0 && face === "normal") face = "blink";
    this.setFace(face);
  }
}
