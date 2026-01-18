
export const hasAccess = (permission: string) => {
  const basePerm = 'dcg';

  const userInfo = localStorage.userInfo
    ? JSON.parse(localStorage.userInfo || '')
    : ''

  const permissions = localStorage.permissions
    ? JSON.parse(localStorage.permissions)
    : [];

  if (permission === '*' || permission.includes('*')) {
    return true;
  }

  if (!userInfo) {
    return false;
  }

  if (!permission) {
    return false;
  }

  if (!permissions) {
    return false;
  }

  const requiredPermission = `${basePerm}:${permission}`

  return !!permissions.find(
    (perm: any) =>
      requiredPermission.startsWith(`${perm}:`) || perm === requiredPermission
  )
}
