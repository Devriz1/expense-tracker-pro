import { useGoogleAuth as useContextAuth } from '../contexts/AuthContext';

export function useGoogleAuth() {
  return useContextAuth();
}
