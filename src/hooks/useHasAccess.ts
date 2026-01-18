// import { useSelector } from 'react-redux';
// import type { RootState } from '../store/store';

export const useHasAccess = (permission: string) => {

    permission = permission;
    
    return true;

    // const basePermission = 'kii'

    // const accountInfo = useSelector((state: RootState) => state.account.accountInfo);
    // const permissions = accountInfo?.permissions;

    // if (!permission) {
    //     return false;
    // }

    // if (permission === '*' || permission.includes('*')) {
    //     return true;
    // }

    // if (!permissions?.length) {
    //     return false;
    // }

    // const requiredPermission = `${basePermission}:${permission}`

    // return !!permissions.find(
    //     (perm: any) =>
    //         requiredPermission.startsWith(`${perm}:`) || perm === requiredPermission
    // )
}