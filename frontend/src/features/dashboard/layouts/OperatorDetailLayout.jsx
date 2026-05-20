import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  activateDashboardOperator,
  getDashboardOperators,
  suspendDashboardOperator,
} from '../services/dashboardApi';
import { useOperatorScope } from '../context/OperatorScopeContext';
import { usePermissions } from '../hooks/usePermissions';

function OperatorDetailLayout() {
  const { operatorId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { operator, loading, error } = useOperatorScope();
  const { isAdmin } = usePermissions();
  const [allOperators, setAllOperators] = useState([]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    getDashboardOperators()
      .then((res) => setAllOperators(Array.isArray(res) ? res : res?.items ?? []))
      .catch(() => {});
  }, [isAdmin]);

  const handleSuspend = useCallback(async () => {
    try {
      await suspendDashboardOperator(operatorId);
      toast.success('Operator suspended');
      navigate('/dashboard/operators');
    } catch (err) {
      toast.error(err.message || 'Failed to suspend operator');
    }
  }, [operatorId, navigate]);

  const handleActivate = useCallback(async () => {
    try {
      await activateDashboardOperator(operatorId);
      toast.success('Operator activated');
      window.location.reload();
    } catch (err) {
      toast.error(err.message || 'Failed to activate operator');
    }
  }, [operatorId]);

  const handleSwitcherChange = (e) => {
    const nextId = e.target.value;
    if (!nextId || nextId === operatorId) {
      return;
    }
    const hubPrefix = `/dashboard/operators/${operatorId}`;
    const suffix = location.pathname.startsWith(hubPrefix)
      ? location.pathname.slice(hubPrefix.length)
      : '';
    navigate(`/dashboard/operators/${nextId}${suffix}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-slate-500">
        Loading operator...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const statusClass =
    operator?.status === 'SUSPENDED'
      ? 'bg-rose-100 text-rose-700'
      : 'bg-emerald-100 text-emerald-700';

  return (
    <div className="space-y-4">
      <nav className="text-sm text-slate-500">
        {isAdmin && (
          <>
            <Link to="/dashboard/operators" className="hover:text-slate-800">
              Operators
            </Link>
            <span className="mx-2">/</span>
          </>
        )}
        <span className="font-medium text-slate-800">
          {operator?.companyName || 'Operator'}
        </span>
      </nav>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {operator?.companyName || 'Operator'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{operator?.email || operator?.slug}</p>
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}
            >
              {operator?.status || 'UNKNOWN'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && allOperators.length > 0 && (
              <select
                value={operatorId}
                onChange={handleSwitcherChange}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                aria-label="Switch operator"
              >
                {allOperators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.companyName}
                  </option>
                ))}
              </select>
            )}
            {isAdmin && operator?.status === 'SUSPENDED' ? (
              <button
                type="button"
                onClick={handleActivate}
                className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
              >
                Activate
              </button>
            ) : isAdmin ? (
              <button
                type="button"
                onClick={handleSuspend}
                className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
              >
                Suspend
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <Outlet />
    </div>
  );
}

export default OperatorDetailLayout;
