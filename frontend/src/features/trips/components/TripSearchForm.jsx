function TripSearchForm({
  from,
  to,
  date,
  onFromChange,
  onToChange,
  onDateChange,
  onSwap,
  onSubmit,
  containerClassName = "bg-white p-6 rounded-xl shadow-sm border border-gray-100",
}) {
  return (
    <div className={containerClassName}>
      <form
        onSubmit={onSubmit}
        className="flex flex-col lg:flex-row items-end gap-x-4 gap-y-6"
      >
        <div className="w-full relative">
          <label className="label py-1">
            <span className="label-text text-[11px] font-bold text-[#6b7280] uppercase tracking-widest px-1">
              From City
            </span>
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#16a34a] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Enter Origin"
              className="input input-bordered w-full h-12 rounded-xl bg-[#f9fafb] border-slate-200 pl-11 text-sm font-bold text-[#111827] focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/20 transition-all"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-center pb-2 px-1">
          <button
            type="button"
            onClick={onSwap}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#16a34a] shadow-sm hover:shadow-md hover:bg-slate-50 transition-all active:scale-90"
            title="Swap Cities"
          >
            <span className="text-xl font-bold leading-none select-none mt-[-2px]">
              ⇄
            </span>
          </button>
        </div>

        <div className="w-full relative">
          <label className="label py-1">
            <span className="label-text text-[11px] font-bold text-[#6b7280] uppercase tracking-widest px-1">
              To City
            </span>
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#16a34a] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Enter Destination"
              className="input input-bordered w-full h-12 rounded-xl bg-[#f9fafb] border-slate-200 pl-11 text-sm font-bold text-[#111827] focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/20 transition-all"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="w-full lg:w-[350px]">
          <label className="label py-1">
            <span className="label-text text-[11px] font-bold text-[#6b7280] uppercase tracking-widest px-1">
              Journey Date
            </span>
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#16a34a] pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                />
              </svg>
            </div>
            <input
              type="date"
              className="input input-bordered w-full h-12 rounded-xl bg-[#f9fafb] border-slate-200 pl-11 text-sm font-bold text-[#111827] focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/20 transition-all"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="w-full lg:w-auto pb-0">
          <button
            type="submit"
            className="btn bg-[#16a34a] hover:bg-[#15803d] text-white w-full lg:w-auto px-10 h-12 rounded-xl border-none font-bold tracking-wider shadow-lg shadow-[#16a34a]/30 transition-all hover:scale-[1.02] active:scale-95 text-sm uppercase"
          >
            Search Bus
          </button>
        </div>
      </form>
    </div>
  );
}

export default TripSearchForm;
