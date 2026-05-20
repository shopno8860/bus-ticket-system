import { usePermissions } from '../hooks/usePermissions';

function PermissionGate({ permission, permissions, children, fallback = null }) {
  const { can } = usePermissions();
  const required = permissions ?? (permission ? [permission] : []);

  const allowed =
    required.length === 0 || required.every((item) => can(item));

  if (!allowed) {
    return fallback;
  }

  return children;
}

export default PermissionGate;
