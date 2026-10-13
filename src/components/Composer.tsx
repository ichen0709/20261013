import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SendResult } from '../types';
import { MESSAGE_MAX } from '../types';
import { RATE_LOCK_MS } from '../lib/rateLimit';
import { charLength } from '../lib/validation';
import { useMediaQuery } from '../lib/useMediaQuery';
import { ClockIcon, SendIcon, SmileIcon } from './Icons';
import { EmojiPicker } from './EmojiPicker';

const SHOW_COUNT_FROM = 450;

interface Props {
  /** 斷線等原因不能送出 */
  disabled: boolean;
  /** 被鎖到什麼時候(毫秒時間戳) */
  lockedUntil: number;
  onSend: (content: string) => Promise<SendResult>;
}

export function Composer({ disabled, lockedUntil, onSend }: Props) {
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const area = useRef<HTMLTextAreaElement>(null);
  const sending = useRef(false);
  // 手機(觸控)上 Enter 是換行,用按鈕送出,避免誤送
  const touch = useMediaQuery('(pointer: coarse)');

  const length = charLength(text);
  const over = length > MESSAGE_MAX;
  const locked = lockedUntil > now;
  const canSend = !disabled && !locked && !over && text.trim().length > 0;

  // 鎖定倒數
  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= lockedUntil) clearInterval(timer);
    }, 200);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  // 解鎖後把游標放回輸入框
  const wasLocked = useRef(false);
  useEffect(() => {
    if (wasLocked.current && !locked) area.current?.focus();
    wasLocked.current = locked;
  }, [locked]);

  // 輸入框隨內容長高,最高 120 px
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text, locked]);

  async function submit() {
    if (!canSend || sending.current) return;
    sending.current = true;
    try {
      const result = await onSend(text);
      if (result.ok) setText('');
    } finally {
      sending.current = false;
    }
  }

  function insertEmoji(emoji: string) {
    const el = area.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? start;
    setText(text.slice(0, start) + emoji + text.slice(end));
    if (el && !touch) {
      const caret = start + emoji.length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(caret, caret);
      });
    }
  }

  const secondsLeft = Math.max(1, Math.ceil((lockedUntil - now) / 1000));
  const percent = Math.max(0, Math.min(100, ((lockedUntil - now) / RATE_LOCK_MS) * 100));

  return (
    <>
      <div className="comp">
        <div className="in">
          {locked ? (
            <div className="lock" role="status">
              <ClockIcon size={20} />
              送太快了,請稍等 {secondsLeft} 秒
              <span className="bar" style={{ width: `${percent}%` }} />
            </div>
          ) : (
            <div className="box">
              <button
                type="button"
                className={emojiOpen ? 'emobtn on' : 'emobtn'}
                aria-label={emojiOpen ? '關閉 emoji 選單' : '開啟 emoji 選單'}
                aria-expanded={emojiOpen}
                disabled={disabled}
                onClick={() => setEmojiOpen((v) => !v)}
              >
                <SmileIcon size={24} />
              </button>
              <textarea
                ref={area}
                className="ta"
                rows={1}
                aria-label="輸入訊息"
                placeholder={disabled ? '重新連線後才能送出' : '輸入訊息…'}
                value={text}
                disabled={disabled}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  // 注音、拼音輸入法選字時按 Enter 不能當成送出
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !touch) {
                    e.preventDefault();
                    void submit();
                  }
                }}
              />
              <button type="button" className="send" aria-label="送出" disabled={!canSend} onClick={() => void submit()}>
                <SendIcon size={22} />
              </button>
            </div>
          )}
          <div className="foot">
            <span>{!touch && !locked ? 'Enter 送出,Shift + Enter 換行' : ''}</span>
            {length >= SHOW_COUNT_FROM && (
              <span className={over || length >= MESSAGE_MAX - 14 ? 'count near' : 'count'} aria-live="polite">
                {length} / {MESSAGE_MAX}
              </span>
            )}
          </div>
        </div>
      </div>
      {emojiOpen && !locked && <EmojiPicker onPick={insertEmoji} />}
    </>
  );
}
