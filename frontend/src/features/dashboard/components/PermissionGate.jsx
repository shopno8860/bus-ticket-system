import { usePermissions } from '../hooks/usePermissions';

function PermissionGate({
  permission,
  permissions,
  match = 'all',
  children,
  fallback = null,
}) {
  const { can, canAny } = usePermissions();
  const required = permissions ?? (permission ? [permission] : []);

  const allowed =
    required.length === 0 ||
    (match === 'any'
      ? canAny(...required)
      : required.every((item) => can(item)));

  if (!allowed) {
    return fallback;
  }

  return children;
}

export default PermissionGate;
