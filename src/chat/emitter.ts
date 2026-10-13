// 很小的事件發送器:聊天服務用它把「新訊息、名單更新…」通知給畫面。

type Handler = (...args: never[]) => void;

export class Emitter<M extends { [K in keyof M]: Handler }> {
  private readonly handlers = new Map<keyof M, Set<Handler>>();

  /** 訂閱一個事件。回傳的函式用來取消訂閱 */
  on<K extends keyof M>(event: K, handler: M[K]): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  emit<K extends keyof M>(event: K, ...args: Parameters<M[K]>): void {
    this.handlers.get(event)?.forEach((h) => (h as (...a: Parameters<M[K]>) => void)(...args));
  }
}
