import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDashboardOperator, getDashboardProfile } from '../services/dashboardApi';
import { usePermissions } from '../hooks/usePermissions';

const OperatorScopeContext = createContext(null);

export function OperatorScopeProvider({ children }) {
  const { operatorId: routeOperatorId } = useParams();
  const { isAdmin } = usePermissions();
  const [operator, setOperator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!routeOperatorId) {
      setLoading(false);
      return;
    }

    if (isAdmin) {
      localStorage.setItem('dashboard:lastOperatorId', routeOperatorId);
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    const loadOperator = isAdmin
      ? getDashboardOperator(routeOperatorId)
      : getDashboardProfile();

    loadOperator
      .then((data) => {
        if (!cancelled) {
          setOperator(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load operator');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [routeOperatorId, isAdmin]);

  const value = useMemo(
    () => ({
      operatorId: routeOperatorId ?? null,
      operator,
      loading,
      error,
      inOperatorHub: Boolean(routeOperatorId),
      hubBasePath: routeOperatorId
        ? `/dashboard/operators/${routeOperatorId}`
        : '/dashboard',
    }),
    [routeOperatorId, operator, loading, error],
  );

  return (
    <OperatorScopeContext.Provider value={value}>
      {children}
    </OperatorScopeContext.Provider>
  );
}

export function useOperatorScope() {
  const context = useContext(OperatorScopeContext);
  if (!context) {
    return {
      operatorId: null,
      operator: null,
      loading: false,
      error: '',
      inOperatorHub: false,
      hubBasePath: '/dashboard',
    };
  }
  return context;
}
