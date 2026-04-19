import { useState } from "react";
import { useNavigate } from "react-router-dom";

const SearchForm = () => {
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (date) params.set("date", date);
    navigate(`/trips?${params.toString()}`);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 w-full md:max-w-7xl mx-auto mt-[-40px] relative z-20">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col md:flex-row items-end gap-4 w-full"
      >
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-gray-700 font-medium">
              From City
            </span>
          </label>
          <input
            type="text"
            required
            placeholder="Enter origin"
            className="input input-bordered w-full bg-white text-gray-800"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-gray-700 font-medium">
              To City
            </span>
          </label>
          <input
            type="text"
            required
            placeholder="Enter destination"
            className="input input-bordered w-full bg-white text-gray-800"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-gray-700 font-medium">
              Journey Date
            </span>
          </label>
          <input
            type="date"
            required
            className="input input-bordered w-full bg-white text-gray-800"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="w-full md:w-auto">
          <button
            type="submit"
            className="btn bg-[#16a34a] hover:bg-[#15803d] text-white w-full md:w-auto px-10 rounded-lg border-none font-bold transition-all duration-300"
          >
            Search Bus
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchForm;
