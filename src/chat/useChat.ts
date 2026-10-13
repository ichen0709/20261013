// 讓畫面方便使用聊天服務的橋接:把服務的通知整理成畫面要的狀態。
// 這裡只認 ChatService 合約,不知道背後是假服務還是 Supabase。

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ConnectionStatus,
  JoinErrorCode,
  JoinResult,
  Member,
  Message,
  SendResult,
  SystemNotice,
} from '../types';
import { RateLimiter } from '../lib/rateLimit';
import { validateMessage, validateNickname } from '../lib/validation';
import type { ChatService } from './ChatService';

/** 訊息列表裡的一項:聊天訊息,或進出提示 */
export type TimelineItem =
  | { kind: 'message'; id: string; ts: number; message: Message }
  | { kind: 'notice'; id: string; ts: number; notice: SystemNotice };

const MAX_ITEMS = 500;

function byTime(a: TimelineItem, b: TimelineItem): number {
  return a.ts - b.ts;
}

function toItem(message: Message): TimelineItem {
  return { kind: 'message', id: message.id, ts: Date.parse(message.createdAt) || 0, message };
}

/** 加入新訊息:相同 id 只留一則,依時間排序 */
function mergeMessages(prev: TimelineItem[], incoming: Message[]): TimelineItem[] {
  const known = new Set(prev.filter((i) => i.kind === 'message').map((i) => i.id));
  const fresh = incoming.filter((m) => !known.has(m.id)).map(toItem);
  if (fresh.length === 0) return prev;
  return [...prev, ...fresh].sort(byTime).slice(-MAX_ITEMS);
}

export interface ChatState {
  nickname: string | null;
  items: TimelineItem[];
  members: Member[];
  status: ConnectionStatus;
  /** 歷史訊息載入完了沒 */
  loaded: boolean;
  /** 被擠下線的原因(重連後代號被別人用了) */
  evicted: JoinErrorCode | null;
  /** 輸入框被鎖到什麼時候(毫秒時間戳);0 表示沒鎖 */
  lockedUntil: number;
  join: (nickname: string) => Promise<JoinResult>;
  send: (content: string) => Promise<SendResult>;
  leave: () => void;
}

export function useChat(service: ChatService): ChatState {
  const [nickname, setNickname] = useState<string | null>(null);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [loaded, setLoaded] = useState(false);
  const [evicted, setEvicted] = useState<JoinErrorCode | null>(null);
  const [lockedUntil, setLockedUntil] = useState(0);
  const limiter = useRef(new RateLimiter());
  const noticeSeq = useRef(0);
  const statusRef = useRef<ConnectionStatus>('connecting');

  const reset = useCallback(() => {
    setNickname(null);
    setItems([]);
    setMembers([]);
    setStatus('connecting');
    setLoaded(false);
    setLockedUntil(0);
    limiter.current.reset();
  }, []);

  useEffect(() => {
    const offs = [
      service.on('history', (messages) => {
        setItems(messages.map(toItem).sort(byTime));
        setLoaded(true);
      }),
      service.on('message', (message) => setItems((prev) => mergeMessages(prev, [message]))),
      service.on('catchUp', (messages) => setItems((prev) => mergeMessages(prev, messages))),
      service.on('members', setMembers),
      service.on('notice', (notice) => {
        noticeSeq.current += 1;
        const item: TimelineItem = {
          kind: 'notice',
          id: `notice-${noticeSeq.current}`,
          ts: Date.parse(notice.at) || Date.now(),
          notice,
        };
        setItems((prev) => [...prev, item].sort(byTime).slice(-MAX_ITEMS));
      }),
      service.on('status', (s) => {
        statusRef.current = s;
        setStatus(s);
      }),
      service.on('evicted', (reason) => {
        reset();
        setEvicted(reason);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [service, reset]);

  const join = useCallback(
    async (raw: string): Promise<JoinResult> => {
      setEvicted(null);
      const check = validateNickname(raw);
      if (!check.ok) return check;
      const result = await service.join(check.value);
      if (result.ok) setNickname(check.value);
      return result;
    },
    [service],
  );

  const send = useCallback(
    async (content: string): Promise<SendResult> => {
      const check = validateMessage(content);
      if (!check.ok) return check;
      if (statusRef.current !== 'connected') return { ok: false, error: 'NOT_CONNECTED' };
      const wait = limiter.current.attempt();
      if (wait > 0) {
        setLockedUntil(Date.now() + wait);
        return { ok: false, error: 'RATE_LIMITED' };
      }
      return service.sendMessage(check.value);
    },
    [service],
  );

  const leave = useCallback(() => {
    service.leave();
    reset();
  }, [service, reset]);

  return { nickname, items, members, status, loaded, evicted, lockedUntil, join, send, leave };
}
