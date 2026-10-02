import type { QuestSystem } from "../core/QuestSystem";

/** Lời thoại (Phase 6). Mỗi nhân vật trả về một kịch bản tuỳ theo tiến độ nhiệm vụ. */
export type Effect = { type: "complete"; quest: string } | { type: "offer"; quest: string } | { type: "action"; id: string };
export interface Choice { text: string; goto?: string; effects?: Effect[] }
export interface Node {
  /** "npc" = nhân vật nói; "me" = chủ quầy nói. */
  who: "npc" | "me";
  text: string;
  choices?: Choice[];
  goto?: string;
  effects?: Effect[];
}
export interface Script { start: string; nodes: Record<string, Node> }

const BYE = "Dạ con đi đây ạ!";
const pick = <T>(list: T[], seed: number) => list[Math.abs(Math.floor(seed)) % list.length];

function chuTu(q: QuestSystem, seed: number): Script {
  if (q.isActive("talk-chu-tu")) {
    return {
      start: "a",
      nodes: {
        a: { who: "npc", text: "Ủa, con là đứa mới nhận lại cái xe cà phê đầu hẻm hả? Chú là Tư, sửa xe ở đây hai chục năm rồi.", choices: [
          { text: "Dạ, con chào chú Tư ạ!", goto: "b" },
          { text: "Dạ, con mới dọn về. Mong chú chỉ bảo thêm!", goto: "b" },
        ] },
        b: { who: "npc", text: "Ừa, ngoan! Có gì cần cứ qua chú. Nè, cầm chút lấy hên mở hàng nghen.", goto: "c", effects: [{ type: "complete", quest: "talk-chu-tu" }] },
        c: { who: "npc", text: "Mà con mới tới, đi chào bà con một vòng cho quen mặt đi.", effects: [{ type: "offer", quest: "meet-neighbors" }] },
      },
    };
  }
  if (q.isNew("meet-neighbors")) {
    return { start: "a", nodes: { a: { who: "npc", text: "Sao rồi con, chịu đi chào bà con trong phố chưa?", effects: [{ type: "offer", quest: "meet-neighbors" }] } } };
  }
  if (q.isActive("meet-neighbors")) {
    return { start: "a", nodes: { a: { who: "npc", text: "Chào cô Ba với bé Mai chưa con? Nhớ coi cái bảng tin đầu hẻm nữa nghen.", choices: [{ text: "Dạ, con đi liền!" }] } } };
  }
  return {
    start: "a",
    nodes: {
      a: { who: "npc", text: pick(["Hôm nay đông nghen! Bán đắt nha con!", "Xe cộ dạo này hư hoài, chú làm không ngơi tay.", "Cà phê con pha thơm tới bên này luôn đó."], seed), choices: [
        { text: "Dạ, hôm nay cũng ổn ạ!", goto: "b" },
        { text: "Chú có việc gì cần con giúp không?", goto: "c" },
        { text: BYE },
      ] },
      b: { who: "npc", text: "Ừa, ráng giữ chất lượng là khách tự tìm tới thôi con." },
      c: { who: "npc", text: "Giờ thì chưa. Bữa nào chú thèm ly cà phê đen là kêu con liền." },
    },
  };
}

function coBa(q: QuestSystem, seed: number): Script {
  const help: Node = q.isNew("walk-street") && q.isDone("talk-chu-tu")
    ? { who: "npc", text: "Có chớ! Con mới về, đi một vòng cho biết phố biết phường đi rồi về kể cô nghe.", effects: [{ type: "offer", quest: "walk-street" }] }
    : q.isActive("walk-street")
      ? { who: "npc", text: "Con đi hết phố chưa? Nhà mình, trạm xe buýt, rồi lối ra bờ sông đó." }
      : { who: "npc", text: "Chưa đâu con. Lo bán cho đắt hàng đi, có gì cô kêu." };
  return {
    start: "a",
    nodes: {
      a: { who: "npc", text: pick(["Chủ quán mới đó hả con? Cô nhập thêm đá, chiều bán tiếp nghen.", "Sáng nay khách ghé đông quá ha! Nhờ có quán con mà phố vui hẳn.", "Thiếu sữa, thiếu đường thì qua cô, cô để giá hàng xóm."], seed), choices: [
        { text: "Dạ con chào cô Ba!", goto: "b" },
        { text: "Cô có cần con giúp gì không?", goto: "c" },
        { text: "Con muốn mua ít nguyên liệu.", effects: [{ type: "action", id: "shop" }] },
        { text: BYE },
      ] },
      b: { who: "npc", text: "Ừa, chào con. Trưa nắng nhớ đội nón nghen!" },
      c: help,
    },
  };
}

function mai(_q: QuestSystem, seed: number): Script {
  return {
    start: "a",
    nodes: {
      a: { who: "npc", text: pick(["Chào chủ quán! Em là Mai, ngày nào em cũng ngồi đây đó. Cà phê ở đây thơm ghê.", "Phố Hoa Sữa mùa này đẹp quá chừng, em chụp hình hoài không chán."], seed), choices: [
        { text: "Cảm ơn Mai, bữa nào ghé thử món mới nha!", goto: "b" },
        { text: "Mai ngồi chơi nha, mình ra quầy đây." },
      ] },
      b: { who: "npc", text: "Dạ, có món mới là em thử đầu tiên luôn!" },
    },
  };
}

const ONE_LINERS: Record<string, string[]> = {
  hoang: ["Xin lỗi, tôi đang vội đi làm. Hôm nào rảnh tôi ghé uống cà phê nhé!", "Sáng nào không có ly cà phê là tôi làm không nổi."],
  lan: ["Dạ tụi em đi học ạ! Tan học em ghé mua trà tắc nha.", "Hoa sữa nở thơm ghê ha anh chị!"],
  nam: ["Em đang ôn bài kiểm tra, bữa sau em ghé quán ngồi học.", "Dạ chào chủ quán ạ!"],
  minh: ["Em đang chạy đơn, lát quay lại lấy ly cà phê sữa đá nghen!", "Nhanh gọn là được thôi! Quán mình có bán mang đi không?"],
};

/** Kịch bản hội thoại cho nhân vật `id` (seed để đổi câu chào mỗi lần). */
export function dialogueFor(id: string, q: QuestSystem, seed: number): Script {
  if (id === "chutu") return chuTu(q, seed);
  if (id === "coba") return coBa(q, seed);
  if (id === "mai") return mai(q, seed);
  return { start: "a", nodes: { a: { who: "npc", text: pick(ONE_LINERS[id] ?? ["Chào bạn!"], seed) } } };
}
