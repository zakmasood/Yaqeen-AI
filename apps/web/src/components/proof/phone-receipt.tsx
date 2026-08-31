/** Visual stand-in for a submitted Easypaisa screenshot — not a real receipt. */
export function PhoneReceipt() {
  return (
    <div className="mx-auto w-[220px] rounded-[28px] border-[8px] border-slate-800 bg-slate-800 shadow-card">
      <div className="rounded-[18px] bg-white px-3 pb-4 pt-5">
        <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
          easypaisa
        </p>
        <div className="mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <path
              d="M5 12.5 9.2 17 19 7"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="mt-2 text-center text-[11px] font-semibold text-slate-800">
          Money Sent Successfully
        </p>
        <p className="mt-3 text-center text-lg font-bold text-slate-900">PKR 2,500</p>
        <dl className="mt-3 space-y-1.5 text-[10px] text-slate-600">
          <div className="flex justify-between">
            <dt>Date</dt>
            <dd>12 May 2024</dd>
          </div>
          <div className="flex justify-between">
            <dt>Recipient</dt>
            <dd>Asad Ali</dd>
          </div>
          <div className="flex justify-between">
            <dt>Fee</dt>
            <dd>PKR 0.00</dd>
          </div>
          <div className="flex justify-between font-medium text-slate-800">
            <dt>TID</dt>
            <dd>EP-8K72-19Q</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
