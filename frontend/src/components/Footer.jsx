import { FaFacebook, FaInstagram, FaLinkedin } from 'react-icons/fa';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 md:py-16">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          
          {/* Left Section */}
          <div className="flex flex-col space-y-4">
            <Link to="/" className="text-3xl font-bold tracking-tight">
              <span className="text-white">Easy</span>
              <span className="text-green-500">Trip</span>
            </Link>
            <p className="text-gray-400 max-w-sm leading-relaxed">
              Book bus tickets across Bangladesh easily and securely with EasyTrip.
            </p>
          </div>

          {/* Middle Section */}
          <div className="flex flex-col space-y-4 md:items-center">
            <div className="flex flex-col space-y-4">
              <h3 className="text-xl font-semibold text-white tracking-wide">Quick Links</h3>
              <ul className="flex flex-col space-y-3">
                <li>
                  <Link to="/" className="hover:text-green-500 transition-colors duration-300 ease-in-out block">Home</Link>
                </li>
                <li>
                  <Link to="/search" className="hover:text-green-500 transition-colors duration-300 ease-in-out block">Search Buses</Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-green-500 transition-colors duration-300 ease-in-out block">Contact</Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex flex-col space-y-4 md:items-end">
             <div className="flex flex-col space-y-4">
                <h3 className="text-xl font-semibold text-white tracking-wide">Follow Us</h3>
                <div className="flex space-x-6">
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1877F2] hover:scale-110 transition-all duration-300 ease-in-out">
                    <FaFacebook size={26} />
                  </a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#E4405F] hover:scale-110 transition-all duration-300 ease-in-out">
                    <FaInstagram size={26} />
                  </a>
                  <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#0A66C2] hover:scale-110 transition-all duration-300 ease-in-out">
                    <FaLinkedin size={26} />
                  </a>
                </div>
            </div>
          </div>

        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-gray-800 mt-16 text-center">
          <p className="text-gray-500 text-sm">
            © 2026 EasyTrip. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
