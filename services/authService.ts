export interface AuthStatus {
  authenticated: boolean;
  user: { email?: string; name?: string; picture?: string } | null;
}

export class AuthService {
  private status: AuthStatus = { authenticated: false, user: null };

  async fetchStatus(): Promise<AuthStatus> {
    try {
      const resp = await fetch('http://localhost:3001/auth/status', { credentials: 'include' });
      if (resp.ok) {
        this.status = await resp.json();
      }
    } catch {}
    return this.status;
  }

  get isAuthenticated(): boolean {
    return !!this.status.authenticated;
  }

  signIn(): void {
    window.location.href = 'http://localhost:3001/auth/google';
  }

  async signOut(): Promise<void> {
    await fetch('http://localhost:3001/auth/logout', { method: 'POST', credentials: 'include' });
    this.status = { authenticated: false, user: null };
    window.location.reload();
  }
}

