import { useEffect, useState } from 'react';
import { getDashboardOperators } from '../services/dashboardApi';

function OperatorSelect({ value, onChange, required = true }) {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getDashboardOperators()
      .then((data) => {
        if (mounted) {
          setOperators(Array.isArray(data) ? data : []);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        Operator {required ? '*' : ''}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={loading}
        className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value="">{loading ? 'Loading operators...' : 'Select operator'}</option>
        {operators.map((operator) => (
          <option key={operator.id} value={operator.id}>
            {operator.companyName}
          </option>
        ))}
      </select>
    </label>
  );
}

export default OperatorSelect;
