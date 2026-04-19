import { useNavigate } from "react-router-dom";

const destinations = [
  {
    id: 1,
    name: "Cox's Bazar",
    route: "Dhaka → Cox's Bazar",
    image:
      "https://s3-ap-south-1.amazonaws.com/shohoz-bus/prod/destinations/Dhaka-1440x600.jpg?v=1.0.4",
  },
  {
    id: 2,
    name: "Sylhet",
    route: "Dhaka → Sylhet",
    image:
      "https://s3-ap-south-1.amazonaws.com/shohoz-bus/prod/destinations/Sylhet-1440x600.jpg?v=1.0.4",
  },
  {
    id: 3,
    name: "Chittagong",
    route: "Dhaka → Chittagong",
    image:
      "https://s3-ap-south-1.amazonaws.com/shohoz-bus/prod/destinations/Chittagong-1440x600.jpg?v=1.0.4",
  },
  {
    id: 4,
    name: "Rangpur",
    route: "Dhaka → Rangpur",
    image:
      "https://s3-ap-south-1.amazonaws.com/shohoz-bus/prod/destinations/Rangpur-1440x600.webp?v=1.0.4",
  },
  {
    id: 5,
    name: "Rajshahi",
    route: "Dhaka → Rajshahi",
    image:
      "https://s3-ap-south-1.amazonaws.com/shohoz-bus/prod/destinations/Rajshahi-1440x600.webp?v=1.0.4",
  },
];

const Destinations = () => {
  const navigate = useNavigate();

  const handleCardClick = (destinationName) => {
    const today = new Date().toISOString().split("T")[0];
    const params = new URLSearchParams();
    params.set("from", "Dhaka");
    params.set("to", destinationName);
    params.set("date", today);
    navigate(`/trips?${params.toString()}`);
  };

  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold mb-3 text-gray-800">
          Discover Trending Destinations
        </h2>
        <p className="text-gray-500 text-lg">
          Explore the most popular routes travelers are booking right now
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
        {destinations.map((dest, index) => (
          <div
            key={dest.id}
            onClick={() => handleCardClick(dest.name)}
            className={`group cursor-pointer rounded-xl overflow-hidden shadow-sm border border-gray-50 hover:shadow-lg transition-all duration-300 relative h-[350px] bg-gray-200 ${
              index < 2 ? "lg:col-span-3" : "lg:col-span-2"
            }`}
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{ backgroundImage: `url(${dest.image})` }}
            ></div>

            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 transition-opacity group-hover:opacity-100"></div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 p-5 w-full transform transition-transform duration-300 group-hover:-translate-y-1">
              <h3 className="text-xl font-bold text-white mb-1 drop-shadow-md">
                {dest.name}
              </h3>
              <p className="text-sm font-medium text-gray-200 drop-shadow-sm">
                {dest.route}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Destinations;
