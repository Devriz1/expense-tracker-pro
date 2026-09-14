import { LogOut, RefreshCw, User } from 'lucide-react';
import { useGoogleAuth } from '../hooks/useGoogleAuth';

interface GoogleSignInButtonProps {
  compact?: boolean;
}

export default function GoogleSignInButton({ compact = false }: GoogleSignInButtonProps) {
  const { user, isAuthenticated, isLoading, error, isGoogleConfigured, signIn, signOut } = useGoogleAuth();

  if (!isGoogleConfigured) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <p className="text-sm text-gray-500">
          Google Client ID not configured. Add VITE_GOOGLE_CLIENT_ID to your environment variables.
        </p>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center ${compact ? 'gap-2' : 'justify-between'} p-3 bg-indigo-50 rounded-xl`}>
        <div className="flex items-center gap-3">
          {user.picture ? (
            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 bg-indigo-200 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-600" />
            </div>
          )}
          <div className={compact ? 'hidden sm:block' : ''}>
            <p className="font-medium text-gray-900 text-sm">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="p-1.5 hover:bg-indigo-100 rounded-lg transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4 text-indigo-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12c0 4.418-3.582 8-8 8a8 8 0 01-8-8 8 8 0 018-8 8 8 0 018 8z" />
          </svg>
          <p className="text-sm">{error}</p>
        </div>
      )}
      <button
        onClick={signIn}
        disabled={isLoading}
        className={`btn btn-primary w-full ${compact ? 'text-sm py-2' : ''} ${isLoading ? 'opacity-75 cursor-wait' : ''}`}
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25h-2.075c-.057-.967-.213-1.915-.46-2.816l1.45-1.142c1.121-.873 1.963-2.05 2.41-3.424-1.042 1.097-2.34 1.924-3.77 2.454-1.098-.897-2.288-1.427-3.53-.477-1.25.95-1.48 2.68-.52 3.94-.89.6-1.85.97-2.85 1.02-.85-.05-1.66-.46-2.25-1.17l-1.15 1.51c.84 1.19 2.08 2.09 3.48 2.54-.81.54-1.73.85-2.73.9-1.03.06-1.93-.24-2.68-.94l-.01.01c-.93.91-1.37 2.28-1.16 3.62.21 1.27.97 2.36 2.1 2.98-.77.23-1.57.36-2.39.36-.18 0-.35-.02-.51-.05 1.14.71 2.5 1.13 3.95 1.13 4.75 0 8.35-3.9 8.35-8.75 0-1.34-.14-2.64-.4-3.9z" fill="#FFFFFF" />
              <path d="M12 2C7.03 2 3 6.03 3 11c0 3.72 2.31 6.85 5.56 8.14.4.15.55-.17.55-.37 0-.18-.01-.63-.01-.85-2.24.48-2.73-1.07-2.73-1.07-.37-.95-.9-1.21-1.15-1.46-1-.69-.01-.71.01-.7.02 1 .02 1.53 1.55 1.12 2.04.73 3.22 1.14 4.68 1.14 6.22 0 9.4-5.09 9.4-11.5 0-1.65-.3-3.24-.85-4.72 1.02-.74 1.9-1.66 2.66-2.75z" fill="#FFFFFF" />
            </svg>
            Continue with Google
          </>
        )}
      </button>

      {!error && (
        <p className="text-xs text-gray-500 text-center">
          No password required. Your data stays in your Google Drive.
        </p>
      )}
    </div>
  );
}
