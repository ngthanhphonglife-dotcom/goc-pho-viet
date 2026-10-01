/**
 * Tải tài nguyên có báo tiến độ THẬT: mỗi việc (task) xong mới cộng vào tiến độ.
 * Việc nặng (dựng khu phố) có trọng số lớn hơn.
 */
export interface LoadTask {
  name: string;
  weight?: number;
  run: () => Promise<unknown>;
}

export class AssetLoader {
  private done = 0;
  private total = 0;

  constructor(private onProgress: (p: number, name: string) => void) {}

  async run(tasks: LoadTask[], concurrency = 6): Promise<void> {
    this.done = 0;
    this.total = tasks.reduce((s, t) => s + (t.weight ?? 1), 0);
    this.onProgress(0, "");
    const queue = [...tasks];
    const worker = async () => {
      while (queue.length) {
        const t = queue.shift()!;
        await t.run();
        this.done += t.weight ?? 1;
        this.onProgress(this.done / this.total, t.name);
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  }
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.decoding = "async";
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Không tải được " + url));
    i.src = url;
  });
}
