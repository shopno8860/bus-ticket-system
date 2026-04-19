import React from 'react';

function FilterSidebar({ filters, setFilters, onReset, availableOperators }) {
  const handleBusTypeChange = (type) => {
    setFilters(prev => ({
      ...prev,
      busTypes: prev.busTypes.includes(type)
        ? prev.busTypes.filter(t => t !== type)
        : [...prev.busTypes, type]
    }));
  };

  return (
    <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-200 space-y-8 sticky top-24">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <h2 className="text-xl font-bold text-[#111827]">Filters</h2>
        <button 
          onClick={onReset}
          className="text-xs font-bold text-[#16a34a] hover:text-[#15803d] uppercase tracking-widest transition-colors"
        >
          Reset All
        </button>
      </div>

      {/* Bus Type */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[#6b7280] uppercase tracking-widest">Bus Type</h3>
        <div className="space-y-3">
          {['AC', 'NON_AC'].map(type => (
            <label key={type} className="flex items-center gap-3 group cursor-pointer">
              <input 
                type="checkbox" 
                className="checkbox checkbox-sm rounded-md border-slate-300 checked:bg-[#16a34a] checked:border-[#16a34a]" 
                checked={filters.busTypes.includes(type)}
                onChange={() => handleBusTypeChange(type)}
              />
              <span className="text-sm font-medium text-[#111827] group-hover:text-[#16a34a] transition-colors">
                {type === 'AC' ? 'AC Bus' : 'Non-AC Bus'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Operators */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[#6b7280] uppercase tracking-widest">Operator</h3>
        <select 
          className="select select-bordered w-full rounded-xl bg-[#f9fafb] border-[#e5e7eb] text-sm font-medium text-[#111827] focus:outline-none focus:border-[#16a34a]"
          value={filters.operator}
          onChange={(e) => setFilters(prev => ({ ...prev, operator: e.target.value }))}
        >
          <option value="">All Operators</option>
          {availableOperators.map(op => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>
      </div>

      {/* Boarding Point */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[#6b7280] uppercase tracking-widest">Boarding Point</h3>
        <select 
          className="select select-bordered w-full rounded-xl bg-[#f9fafb] border-[#e5e7eb] text-sm font-medium text-[#111827] focus:outline-none focus:border-[#16a34a]"
          value={filters.boardingPoint}
          onChange={(e) => setFilters(prev => ({ ...prev, boardingPoint: e.target.value }))}
        >
          <option value="">Any Point</option>
          <option value="Gabtoli">Gabtoli</option>
          <option value="Sayedabad">Sayedabad</option>
          <option value="Mohakhali">Mohakhali</option>
          <option value="Abdullahpur">Abdullahpur</option>
        </select>
      </div>

      {/* Dropping Point */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[#6b7280] uppercase tracking-widest">Dropping Point</h3>
        <select 
          className="select select-bordered w-full rounded-xl bg-[#f9fafb] border-[#e5e7eb] text-sm font-medium text-[#111827] focus:outline-none focus:border-[#16a34a]"
          value={filters.droppingPoint}
          onChange={(e) => setFilters(prev => ({ ...prev, droppingPoint: e.target.value }))}
        >
          <option value="">Any Point</option>
          <option value="Chittagong">Chittagong</option>
          <option value="Cox's Bazar">Cox's Bazar</option>
          <option value="Sylhet">Sylhet</option>
          <option value="Rajshahi">Rajshahi</option>
        </select>
      </div>

      <div className="pt-6">
        <div className="bg-[#dcfce7] p-4 rounded-2xl border border-[#16a34a]/10">
          <p className="text-[10px] font-bold text-[#15803d] uppercase tracking-widest mb-1 text-center">Selection Tip</p>
          <p className="text-[11px] text-[#15803d]/80 text-center leading-relaxed font-medium">
            Filtering by bus type helps narrow down comfort results.
          </p>
        </div>
      </div>
    </div>
  );
}

export default FilterSidebar;
