import { apiFetch } from './api';

export const AUTH_STORAGE_KEY = 'ketab_auth';
export const AUTH_CHANGED_EVENT = 'ketab_auth_changed';
export const LAST_NATIONAL_NUMBER_KEY = 'ketab_last_national_number';

export interface AuthState {
  isAuthenticated: boolean;
  username?: string;
  user?: {
    nationalNumber: string;
    name: string;
    role: string;
    school: string;
    phone?: string;
  };
  loginTime?: number;
}

export function getAuthState(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { isAuthenticated: false };
    return JSON.parse(raw) as AuthState;
  } catch {
    return { isAuthenticated: false };
  }
}

export function setAuthState(state: AuthState) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  try {
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
  } catch {
    // no-op for non-browser
  }
}

// Save last entered national number
export function saveLastNationalNumber(nationalNumber: string): void {
  try {
    localStorage.setItem(LAST_NATIONAL_NUMBER_KEY, nationalNumber);
  } catch {
    // no-op if localStorage fails
  }
}

// Get last entered national number
export function getLastNationalNumber(): string {
  try {
    return localStorage.getItem(LAST_NATIONAL_NUMBER_KEY) || '';
  } catch {
    return '';
  }
}

export function logout() {
  setAuthState({ isAuthenticated: false });
}

// Clear authentication on app start (so users always start from cover page)
export function clearAuthOnStart(): void {
  logout();
}

export async function loginAsDeveloper(password: string): Promise<{
  success: boolean;
  sessionToken?: string;
  user?: { nationalNumber: string; name: string; role: string; school: string };
}> {
  try {
    const response = await apiFetch('/api/developer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    if (data.success) {
      setAuthState({
        isAuthenticated: true,
        username: data.user.name,
        user: data.user,
        loginTime: Date.now(),
      });
      return { success: true, sessionToken: data.sessionToken, user: data.user };
    }
    return { success: false };
  } catch (error) {
    console.error('Developer login error:', error);
    return { success: false };
  }
}

export async function loginWithNationalNumber(nationalNumber: string): Promise<boolean> {
  try {
    const response = await apiFetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nationalNumber }),
    });

    const data = await response.json();
    if (data.success) {
      // Save the national number for next time
      saveLastNationalNumber(nationalNumber);
      
      setAuthState({ 
        isAuthenticated: true, 
        username: data.user.name,
        user: data.user,
        loginTime: Date.now() 
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
}

export async function loginAsGuest(fullName: string, phoneNumber: string): Promise<boolean> {
  try {
    const trimmedName = fullName.trim();
    const trimmedPhone = phoneNumber.trim();
    if (!trimmedName || !trimmedPhone) {
      return false;
    }

    const response = await apiFetch('/api/login/guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fullName: trimmedName, phoneNumber: trimmedPhone }),
    });
    const data = await response.json();
    if (!data.success || !data.user) {
      return false;
    }

    setAuthState({ 
      isAuthenticated: true, 
      username: data.user.name || trimmedName,
      user: {
        nationalNumber: data.user.nationalNumber,
        name: data.user.name,
        role: data.user.role,
        school: data.user.school,
        phone: data.user.phone || trimmedPhone
      },
      loginTime: Date.now() 
    });
    return true;
  } catch (error) {
    console.error('Guest login error:', error);
    return false;
  }
}
