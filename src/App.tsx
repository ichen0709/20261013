import { useCallback, useEffect, useState } from 'react';
import { useChat } from './chat/useChat';
import { createRuntime } from './config';
import { DevPanel } from './components/DevPanel';
import { loadNickname, saveNickname } from './lib/storage';
import { validateNickname } from './lib/validation';
import { ChatScreen } from './screens/ChatScreen';
import { JoinScreen } from './screens/JoinScreen';
import type { JoinResult } from './types';

// 整個網頁只建立一次聊天服務(放在元件外面,React 開發模式重複執行元件時才不會建出兩個)
const { service, devControls } = createRuntime();

/** 決定現在顯示進入畫面還是聊天室。聊天的細節都交給 useChat 與聊天服務 */
export default function App() {
  const chat = useChat(service);
  const [initialNickname] = useState(loadNickname);

  // 關掉分頁、離開頁面時,盡力通知其他人「我離開了」
  useEffect(() => {
    const onHide = () => service.leave();
    // 從瀏覽器的「上一頁快取」回來時,已經離開聊天室了,重新載入最單純
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('pageshow', onShow);
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('pageshow', onShow);
    };
  }, []);

  const join = useCallback(
    async (nickname: string): Promise<JoinResult> => {
      const result = await chat.join(nickname);
      const check = validateNickname(nickname);
      if (result.ok && check.ok) saveNickname(check.value);
      return result;
    },
    [chat],
  );

  return (
    <>
      {chat.nickname !== null ? (
        <ChatScreen chat={chat} nickname={chat.nickname} onLeave={chat.leave} />
      ) : (
        <JoinScreen
          service={service}
          initialNickname={initialNickname}
          evictedReason={chat.evicted}
          onJoin={join}
        />
      )}
      {devControls && <DevPanel controls={devControls} />}
    </>
  );
}
