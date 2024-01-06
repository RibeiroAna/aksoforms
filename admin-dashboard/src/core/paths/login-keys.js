//! Data store paths for login stuff. This is here because these are used in multiple places.

export const LOGIN = 'login';
export const AUTH_STATE = [LOGIN, 'authState'];
export const IS_ADMIN = [LOGIN, 'isAdmin'];
export const TOTP_REQUIRED = [LOGIN, 'totpRequired'];
export const TOTP_SETUP_REQUIRED = [LOGIN, 'totpSetupRequired'];
export const UEA_CODE = [LOGIN, 'ueaCode'];
export const LOGIN_ID = [LOGIN, 'id'];
export const COMPLETED = [LOGIN, 'completed'];
export const IS_ACTUALLY_ADMIN = [LOGIN, 'isActuallyAdmin'];
