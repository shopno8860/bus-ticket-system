import { useNavigate } from "react-router-dom";

const operators = [
  { id: 1, name: "Green Line", color: "text-[#16a34a]" },
  { id: 2, name: "Hanif Enterprise", color: "text-blue-600" },
  { id: 3, name: "Shohagh Paribahan", color: "text-red-600" },
  { id: 4, name: "Ena Transport", color: "text-indigo-600" },
  { id: 5, name: "Alhamra Paribahan", color: "text-orange-600" },
  { id: 6, name: "Orin Travels", color: "text-cyan-600" },
  { id: 7, name: "Desh Travels", color: "text-rose-600" },
  { id: 8, name: "Tuba Line", color: "text-emerald-600" },
];

// Double the array for seamless infinite looping
const loopedOperators = [...operators, ...operators];

const Operators = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 bg-[#f9fafb] w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        {/* Title block with Book Now button */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className="text-left">
            <h2 className="text-3xl md:text-4xl font-black mb-3 text-slate-800 tracking-tight">
              Trusted Bus Operators
            </h2>
            <p className="text-slate-500 text-lg font-medium">
              We partner with over 100+ top-rated transport brands in Bangladesh
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => navigate("/trips")}
              className="group px-8 py-3 bg-[#16a34a] hover:bg-[#15803d] rounded-lg transition-all duration-300 hover:scale-[1.02] text-white border-none shadow-lg shadow-[#16a34a]/20 font-bold flex items-center gap-2"
            >
              Book your ticket now
              <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modern Marquee Showcase */}
      <div className="w-full relative flex mt-4 overflow-hidden mask-fade-edges">
        <div className="flex animate-marquee hover:[animation-play-state:paused] w-max gap-6 px-4 py-8">
          {loopedOperators.map((operator, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-44 md:w-52 h-32 md:h-36 bg-white border border-gray-100 shadow-sm rounded-xl flex flex-col items-center justify-center p-6 hover:-translate-y-2 hover:shadow-xl hover:border-[#16a34a]/20 transition-all duration-300 cursor-pointer text-center group bg-gradient-to-br from-white to-gray-50/50"
            >
              <div className={`mb-4 w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors ${operator.color}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a4.125 4.125 0 1 0 0-8.25 4.125 4.125 0 0 0 0 8.25ZM6.75 12h.008v.008H6.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM11.25 18.75a4.125 4.125 0 1 0 0-8.25 4.125 4.125 0 0 0 0 8.25ZM9.75 12h.008v.008H9.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM15.75 18.75a4.125 4.125 0 1 0 0-8.25 4.125 4.125 0 0 0 0 8.25ZM14.25 12h.008v.008h-.008V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM19.5 18.75a4.125 4.125 0 1 0 0-8.25 4.125 4.125 0 0 0 0 8.25ZM18 12h.008v.008H18V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </div>
              <span className="font-extrabold text-slate-700 text-sm md:text-base tracking-tight truncate w-full group-hover:text-[#16a34a] transition-colors">
                {operator.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .mask-fade-edges {
          mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
        }
      `}</style>
    </section>
  );
};

export default Operators;
