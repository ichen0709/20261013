// 第 5 節定義的資料格式。畫面與聊天服務共用,兩個階段完全相同。

/** 一則聊天訊息 */
export interface Message {
  id: string;
  nickname: string;
  content: string;
  /** ISO 時間字串。階段二以資料庫時間為準 */
  createdAt: string;
}

/** 線上名單裡的一個人 */
export interface Member {
  nickname: string;
  /** 進入時間(重名時用來判斷誰先到) */
  joinedAt: string;
}

/** 進出提示。只在畫面上顯示,不存入資料庫 */
export interface SystemNotice {
  kind: 'joined' | 'left';
  nickname: string;
  at: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting';

export type JoinErrorCode = 'NICKNAME_TAKEN' | 'NICKNAME_INVALID' | 'NETWORK_ERROR';
export type SendErrorCode = 'TOO_LONG' | 'EMPTY' | 'RATE_LIMITED' | 'NOT_CONNECTED';

export type JoinResult = { ok: true } | { ok: false; error: JoinErrorCode };
export type SendResult = { ok: true } | { ok: false; error: SendErrorCode };

/** 代號長度上限(以「字」計,emoji 算一個字) */
export const NICKNAME_MAX = 12;
/** 單則訊息長度上限 */
export const MESSAGE_MAX = 500;
/** 進入時載入的歷史訊息數 */
export const HISTORY_LIMIT = 50;
/** 斷線重連時最多補回的訊息數 */
export const CATCHUP_LIMIT = 200;
