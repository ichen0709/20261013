// 決定這次用哪一種聊天服務。階段二接上 Supabase 時,只需要改這個檔案(加一個分支)
// 並設定環境變數 VITE_CHAT_BACKEND=supabase,畫面程式一個字都不用動。

import type { ChatService } from './chat/ChatService';
import { MockChatService } from './chat/MockChatService';
import type { MockControls } from './chat/MockChatService';

export interface ChatRuntime {
  service: ChatService;
  /** 開發用開關(模擬斷線、示範模式)。網址加上 ?dev=1 才會出現 */
  devControls: MockControls | null;
}

export function createRuntime(): ChatRuntime {
  const backend = import.meta.env.VITE_CHAT_BACKEND || 'mock';
  const params = new URLSearchParams(window.location.search);

  if (backend === 'mock') {
    const service = new MockChatService({ demo: params.get('demo') === '1' });
    return { service, devControls: params.get('dev') === '1' ? service : null };
  }

  throw new Error(`不認得的聊天服務「${backend}」。階段一只支援 mock;Supabase 要到階段二才接上。`);
}
