// 「聊天服務合約」。畫面只認這份合約,不知道背後是假的還是 Supabase。
// 階段一:MockChatService。階段二:SupabaseChatService。兩者必須提供完全相同的指令與通知。

import type {
  ConnectionStatus,
  JoinErrorCode,
  JoinResult,
  Member,
  Message,
  SendResult,
  SystemNotice,
} from '../types';

/** 聊天服務 → 畫面的通知(架構文件 5.2) */
export interface ChatEventMap {
  /** 進入時載入的最近 50 則訊息 */
  history: (messages: Message[]) => void;
  /** 有一則新訊息(包含自己送出的) */
  message: (message: Message) => void;
  /** 線上名單更新 */
  members: (members: Member[]) => void;
  /** 有人進來或離開 */
  notice: (notice: SystemNotice) => void;
  /** 連線狀態改變 */
  status: (status: ConnectionStatus) => void;
  /** 重連後補上漏掉的訊息 */
  catchUp: (messages: Message[]) => void;
  /** 重連後發現代號已被別人使用,必須回到進入畫面 */
  evicted: (reason: JoinErrorCode) => void;
}

export interface ChatService {
  /** 用這個代號進入聊天室 */
  join(nickname: string): Promise<JoinResult>;
  /** 送出一則訊息 */
  sendMessage(content: string): Promise<SendResult>;
  /** 主動離開 */
  leave(): void;
  /** 進入前也能看到目前線上人數(進入畫面用)。回傳取消訂閱的函式 */
  watchOnlineCount(callback: (count: number) => void): () => void;
  /** 訂閱通知。回傳取消訂閱的函式 */
  on<K extends keyof ChatEventMap>(event: K, handler: ChatEventMap[K]): () => void;
}
