export class PromisePool {
  private concurrency: number;
  private running: number;
  private queue: Array<() => void>;

  constructor(concurrency: number) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    // If we can run it now, do so
    if (this.running < this.concurrency) {
      return this.run(fn);
    }

    // Otherwise, queue it
    return new Promise<T>((resolve, reject) => {
      this.queue.push(() => {
        this.run(fn).then(resolve).catch(reject);
      });
    });
  }

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    this.running++;

    try {
      return await fn();
    } finally {
      this.running--;
      this.dequeue();
    }
  }

  private dequeue(): void {
    if (this.queue.length > 0 && this.running < this.concurrency) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}
