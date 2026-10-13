import type { Message } from '../types';
import { formatTime, nickColorClass } from '../lib/format';

/** 單則訊息:自己的靠右、換色;別人的靠左,上方顯示彩色代號。內容一律當純文字顯示 */
export function MessageItem({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <div className={mine ? 'm me' : `m ${nickColorClass(message.nickname)}`}>
      {!mine && <div className="nick">{message.nickname}</div>}
      <div className="row">
        <div className="bubble">{message.content}</div>
        <span className="time">{formatTime(message.createdAt)}</span>
      </div>
    </div>
  );
}
