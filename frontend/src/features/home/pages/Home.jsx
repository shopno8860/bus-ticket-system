import Hero from "../components/Hero";
import SearchForm from "../components/SearchForm";
import Destinations from "../components/Destinations";
import Operators from "../components/Operators";
import Features from "../components/Features";

const Home = () => {
  return (
    <div className="w-full">
      <Hero />
      <SearchForm />
      <Destinations />
      <Operators />
      <Features/>
    </div>
  );
};

export default Home;
