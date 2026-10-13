import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TimelineItem } from '../chat/useChat';
import { ArrowDownIcon, MessageIcon } from './Icons';
import { MessageItem } from './MessageItem';
import { NoticeItem } from './NoticeItem';

const NEAR_BOTTOM_PX = 48;

/**
 * 訊息列表,含捲動規則:
 * - 停在底部時,新訊息進來自動捲到最新
 * - 正在往上翻舊訊息時,畫面不動,底部出現「有新訊息」按鈕
 * - 自己送出的訊息,一定捲到底
 */
export function MessageList({ items, me, loaded }: { items: TimelineItem[]; me: string; loaded: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const stuck = useRef(true);
  const lastId = useRef('');
  const [unread, setUnread] = useState(false);

  const scrollToBottom = () => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (stuck.current) setUnread(false);
  };

  useLayoutEffect(() => {
    const last = items[items.length - 1];
    const id = last?.id ?? '';
    if (id === lastId.current) return;
    const first = lastId.current === '';
    lastId.current = id;

    const mine = last?.kind === 'message' && last.message.nickname === me;
    if (first || stuck.current || mine) {
      scrollToBottom();
      stuck.current = true;
      setUnread(false);
    } else if (last?.kind === 'message') {
      setUnread(true);
    }
  }, [items, me]);

  // 手機鍵盤彈出、視窗大小改變時,如果本來在底部,就繼續停在底部
  useEffect(() => {
    const el = scroller.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (stuck.current) scrollToBottom();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!loaded) {
    return (
      <div className="msgwrap">
        <div className="msgs" role="status" aria-label="載入中">
          <div className="sk"><i /><b style={{ width: 200 }} /></div>
          <div className="sk"><i /><b style={{ width: 150 }} /></div>
          <div className="sk me"><b style={{ width: 170 }} /></div>
          <div className="sk"><i /><b style={{ width: 230 }} /></div>
          <div className="sk me"><b style={{ width: 120 }} /></div>
          <div className="notice">載入中…</div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="msgwrap">
        <div className="center">
          <div className="logo"><MessageIcon size={32} /></div>
          <p>還沒有人說話,來打個招呼吧</p>
        </div>
      </div>
    );
  }

  return (
    <div className="msgwrap">
      <div className="msgs" ref={scroller} onScroll={onScroll} role="log" aria-live="polite" aria-label="聊天訊息">
        {items.map((item) =>
          item.kind === 'message' ? (
            <MessageItem key={item.id} message={item.message} mine={item.message.nickname === me} />
          ) : (
            <NoticeItem key={item.id} notice={item.notice} />
          ),
        )}
      </div>
      {unread && (
        <button
          type="button"
          className="newbtn"
          onClick={() => {
            scrollToBottom();
            stuck.current = true;
            setUnread(false);
          }}
        >
          <ArrowDownIcon size={18} strokeWidth={2.5} />
          有新訊息
        </button>
      )}
    </div>
  );
}
