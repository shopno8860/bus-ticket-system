import { useNavigate } from "react-router-dom";

const operators = [
  { id: 1, name: "Green Line" },
  { id: 2, name: "Hanif Enterprise" },
  { id: 3, name: "Shohagh Paribahan" },
  { id: 4, name: "Ena Transport" },
  { id: 5, name: "Alhamra Paribahan" },
  { id: 6, name: "Orin Travels" },
  { id: 7, name: "Desh Travels" },
  { id: 8, name: "Tuba Line" },
];

// Double the array for seamless infinite looping
const loopedOperators = [...operators, ...operators];

const Operators = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 bg-white w-full max-w-7xl mx-auto px-4 overflow-hidden text-center md:text-left">
      {/* Title block with Book Now button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div className="text-left">
          <h2 className="text-3xl md:text-4xl font-bold mb-2 text-gray-800">
            More than 100+ Trusted Bus Operators
          </h2>
          <p className="text-gray-500 text-lg">
            Travel comfortably with the best transport services
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => navigate("/trips")}
            className="btn bg-[#16a34a] hover:bg-[#15803d] px-8 rounded-lg transition-all duration-300 hover:scale-[1.02] text-white border-none shadow-sm font-semibold"
          >
            Book your ticket now &rarr;
          </button>
        </div>
      </div>

      {/* CSS Marquee */}
      <div className="w-full relative flex mt-8">
        <div className="flex animate-marquee hover:[animation-play-state:paused] w-max gap-8 px-4 py-4">
          {loopedOperators.map((operator, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-48 h-24 bg-white border border-gray-100 shadow-sm rounded-xl flex items-center justify-center p-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer text-center"
            >
              <span className="font-bold text-gray-600 truncate">
                {operator.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Operators;
