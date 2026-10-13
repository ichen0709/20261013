import { useEffect, useState } from 'react';
import type { ChatService } from '../chat/ChatService';
import type { JoinErrorCode, JoinResult } from '../types';
import { NICKNAME_MAX } from '../types';
import { charLength, clampChars } from '../lib/validation';
import { AlertIcon, MessageIcon, SpinnerIcon } from '../components/Icons';

const ERROR_TEXT: Record<JoinErrorCode, string> = {
  NICKNAME_TAKEN: '這個代號有人在用了,換一個試試。',
  NICKNAME_INVALID: `代號要 1 到 ${NICKNAME_MAX} 個字,不能只有空白。`,
  NETWORK_ERROR: '連不上聊天室,請檢查網路後再試一次。',
};

interface Props {
  service: ChatService;
  initialNickname: string;
  /** 重連後被擠下線時,從上一層帶進來的原因 */
  evictedReason: JoinErrorCode | null;
  onJoin: (nickname: string) => Promise<JoinResult>;
}

export function JoinScreen({ service, initialNickname, evictedReason, onJoin }: Props) {
  const [nickname, setNickname] = useState(initialNickname);
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState<JoinErrorCode | null>(null);
  const [online, setOnline] = useState(0);

  useEffect(() => service.watchOnlineCount(setOnline), [service]);

  const length = charLength(nickname);
  const hasError = error !== null || evictedReason !== null;
  const errorText = error
    ? ERROR_TEXT[error]
    : evictedReason
      ? `你離線太久,這個代號已經被別人使用。${ERROR_TEXT[evictedReason]}`
      : null;

  async function submit() {
    if (entering) return;
    setError(null);
    setEntering(true);
    const result = await onJoin(nickname);
    // 成功時這個畫面會被換掉,不用處理;失敗才回到可編輯狀態
    if (!result.ok) {
      setError(result.error);
      setEntering(false);
    }
  }

  return (
    <div className="cr">
      <main className="join">
        <div className="brand">
          <div className="logo">
            <MessageIcon size={28} />
          </div>
          <h1>匿名聊天室</h1>
          <p className="lead">不用註冊、不用登入。取個代號,就能和大家聊天。</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="field">
            <label htmlFor="nick">你的代號</label>
            <input
              id="nick"
              className={hasError ? 'inp err' : 'inp'}
              type="text"
              value={nickname}
              disabled={entering}
              autoComplete="off"
              autoCapitalize="off"
              autoFocus={!initialNickname}
              aria-invalid={hasError}
              aria-describedby="nick-help"
              onChange={(e) => {
                setNickname(clampChars(e.target.value, NICKNAME_MAX));
                setError(null);
              }}
            />
            <div className="help" id="nick-help" aria-live="polite">
              {errorText ? (
                <span className="err-msg">
                  <AlertIcon size={18} />
                  {errorText}
                </span>
              ) : entering ? (
                <span>正在確認代號能不能用…</span>
              ) : initialNickname && nickname === initialNickname ? (
                <span>已帶入上次的代號,可以直接進入,也可以改成別的。</span>
              ) : (
                <span>最多 {NICKNAME_MAX} 個字,中文、英文、emoji 都可以。</span>
              )}
              <span className="cnt">
                {length} / {NICKNAME_MAX}
              </span>
            </div>
          </div>
          <button className="btn" type="submit" disabled={entering}>
            {entering ? (
              <>
                <SpinnerIcon size={20} />
                進入中…
              </>
            ) : (
              '進入聊天室'
            )}
          </button>
        </form>
        <div className="online" style={{ marginTop: -16 }}>
          <span className="dot" />
          {online > 0 ? `目前 ${online} 人在線上` : '現在還沒有人在線上,你可以當第一個'}
        </div>
      </main>
    </div>
  );
}
