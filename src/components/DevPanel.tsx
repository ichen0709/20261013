import { useState } from 'react';
import type { MockControls } from '../chat/MockChatService';

/** 開發用面板:網址加上 ?dev=1 才會出現。用來測試斷線橫幅,以及一個人測試時用的假使用者 */
export function DevPanel({ controls }: { controls: MockControls }) {
  const [open, setOpen] = useState(false);
  const [offline, setOffline] = useState(controls.isOffline());
  const [demo, setDemo] = useState(controls.isDemo());

  return (
    <div className="dev">
      {open && (
        <div className="panel">
          <label>
            <input
              type="checkbox"
              checked={offline}
              onChange={(e) => {
                setOffline(e.target.checked);
                controls.setOffline(e.target.checked);
              }}
            />
            模擬斷線
          </label>
          <label>
            <input
              type="checkbox"
              checked={demo}
              onChange={(e) => {
                setDemo(e.target.checked);
                controls.setDemo(e.target.checked);
              }}
            />
            示範模式(假使用者)
          </label>
        </div>
      )}
      <button type="button" className="chip" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        開發工具
      </button>
    </div>
  );
}
