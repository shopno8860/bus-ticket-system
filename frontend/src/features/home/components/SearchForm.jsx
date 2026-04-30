import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TripSearchForm from "../../trips/components/TripSearchForm";

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
    <div className="w-full md:max-w-7xl mx-auto mt-[-40px] relative z-20">
      <TripSearchForm
        from={from}
        to={to}
        date={date}
        onFromChange={setFrom}
        onToChange={setTo}
        onDateChange={setDate}
        onSwap={() => {
          setFrom(to);
          setTo(from);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default SearchForm;
