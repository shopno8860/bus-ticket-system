import React from 'react';
import { MdTouchApp, MdSecurity, MdEventSeat, MdFlashOn } from 'react-icons/md';

const featuresData = [
  {
    id: 1,
    title: 'Easy Booking',
    description: 'Book tickets in just a few clicks without any hassle.',
    icon: <MdTouchApp />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 2,
    title: 'Secure Payment',
    description: 'Safe and encrypted payment gateways for peace of mind.',
    icon: <MdSecurity />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    id: 3,
    title: 'Live Seat Selection',
    description: 'Choose your preferred seats with real-time availability.',
    icon: <MdEventSeat />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 4,
    title: 'Instant Confirmation',
    description: 'Get your ticket instantly via email and SMS.',
    icon: <MdFlashOn />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
];

const Features = () => {
  return (
    <section className="bg-gray-50 py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Why Choose EasyTrip?
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Experience fast, secure, and hassle-free bus ticket booking
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuresData.map((feature) => (
            <div
              key={feature.id}
              className="bg-white rounded-2xl p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-xl flex flex-col items-center text-center transition-all duration-300 transform hover:-translate-y-2 group cursor-pointer"
            >
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 ${feature.bgColor} group-hover:scale-110`}
              >
                <div className={`text-4xl ${feature.color}`}>
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
