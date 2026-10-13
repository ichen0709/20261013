import type { Member } from '../types';
import { initialOf, nickColorClass } from '../lib/format';

/** 線上名單。自己固定排第一,其他人依進入時間排列 */
export function MemberList({ members, me, showDots }: { members: Member[]; me: string; showDots: boolean }) {
  const others = members
    .filter((m) => m.nickname !== me)
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  return (
    <ul className="mlist">
      <li className="mem c0">
        <span className="av" aria-hidden="true">
          {initialOf(me)}
        </span>
        <span className="name">{me}</span>
        <span className="you">你</span>
      </li>
      {others.map((m) => (
        <li key={m.nickname} className={`mem ${nickColorClass(m.nickname)}`}>
          <span className="av" aria-hidden="true">
            {initialOf(m.nickname)}
          </span>
          <span className="name">{m.nickname}</span>
          {showDots && <span className="dot" aria-hidden="true" />}
        </li>
      ))}
    </ul>
  );
}
