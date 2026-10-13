import type { SystemNotice } from '../types';

/** 進出提示:灰色小字一行,跟著訊息一起往上捲 */
export function NoticeItem({ notice }: { notice: SystemNotice }) {
  return (
    <div className="notice">
      {notice.nickname} {notice.kind === 'joined' ? '進來了' : '離開了'}
    </div>
  );
}
