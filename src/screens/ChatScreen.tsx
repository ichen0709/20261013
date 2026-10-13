import { useEffect, useState } from 'react';
import type { ChatState } from '../chat/useChat';
import { useMediaQuery } from '../lib/useMediaQuery';
import { CloseIcon, LogOutIcon, MessageIcon, UsersIcon } from '../components/Icons';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { Composer } from '../components/Composer';
import { MemberList } from '../components/MemberList';
import { MessageList } from '../components/MessageList';

interface Props {
  chat: ChatState;
  nickname: string;
  onLeave: () => void;
}

/** 電腦(寬螢幕)把線上名單固定在左側;手機收進按鈕,點開才看到 */
const WIDE_QUERY = '(min-width: 760px)';

export function ChatScreen({ chat, nickname, onLeave }: Props) {
  const wide = useMediaQuery(WIDE_QUERY);
  const [sheetOpen, setSheetOpen] = useState(false);
  const online = Math.max(chat.members.length, 1);
  const offline = chat.status !== 'connected';

  // 轉成寬螢幕時,手機用的名單面板就沒意義了
  useEffect(() => {
    if (wide) setSheetOpen(false);
  }, [wide]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const topBar = (
    <header className="top">
      <div className="grow">
        <div className="title">大廳</div>
        <div className="me">
          你是 <b>{nickname}</b>
        </div>
      </div>
      {wide ? (
        <button type="button" className="leave" onClick={onLeave}>
          <LogOutIcon size={18} />
          離開
        </button>
      ) : (
        <>
          <button
            type="button"
            className="pill"
            aria-label={`查看線上名單,目前 ${online} 人在線`}
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(true)}
          >
            <UsersIcon size={18} />
            {online} 人在線
          </button>
          <button type="button" className="iconbtn" aria-label="離開聊天室" onClick={onLeave}>
            <LogOutIcon size={22} />
          </button>
        </>
      )}
    </header>
  );

  const column = (
    <>
      {topBar}
      {chat.status === 'reconnecting' && <ConnectionBanner />}
      <MessageList items={chat.items} me={nickname} loaded={chat.loaded} />
      <Composer disabled={offline} lockedUntil={chat.lockedUntil} onSend={chat.send} />
    </>
  );

  if (wide) {
    return (
      <div className="cr wide">
        <div className="wrap">
          <aside className="side" aria-label="線上名單">
            <div className="brandrow">
              <div className="logo">
                <MessageIcon size={22} />
              </div>
              <b>匿名聊天室</b>
            </div>
            <h2>
              <span className="dot" />
              線上 {online} 人
            </h2>
            <MemberList members={chat.members} me={nickname} showDots={false} />
            <p className="note">不用登入。關掉頁面就等於離開。</p>
          </aside>
          <div className="main">{column}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="cr">
      {column}
      {sheetOpen && (
        <>
          <button type="button" className="scrim" aria-label="關閉名單" onClick={() => setSheetOpen(false)} />
          <section className="sheet" role="dialog" aria-modal="true" aria-label="線上名單">
            <div className="grab" aria-hidden="true" />
            <div className="hd">
              <h2>線上 {online} 人</h2>
              <button type="button" className="iconbtn" aria-label="關閉名單" autoFocus onClick={() => setSheetOpen(false)}>
                <CloseIcon size={22} />
              </button>
            </div>
            <MemberList members={chat.members} me={nickname} showDots />
          </section>
        </>
      )}
    </div>
  );
}
