import { SpinnerIcon } from './Icons';

export function ConnectionBanner() {
  return (
    <div className="banner" role="status">
      <SpinnerIcon size={18} />
      連線中斷,重新連線中…
    </div>
  );
}
