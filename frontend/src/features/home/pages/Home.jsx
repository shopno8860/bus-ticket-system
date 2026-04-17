import Hero from "../components/Hero";
import SearchForm from "../components/SearchForm";
import Destinations from "../components/Destinations";
import Operators from "../components/Operators";

const Home = () => {
  return (
    <div className="w-full">
      <Hero />
      <SearchForm />
      <Destinations />
      <Operators />
    </div>
  );
};

export default Home;
