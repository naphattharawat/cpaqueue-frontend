import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { appUrl } from './app-url.util';

export type AuthUser = {
  username: string;
  displayName: string;
  cid: string;
  roles: string[];
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user$ = new BehaviorSubject<AuthUser | null>(null);
  private loaded = false;

  constructor(private http: HttpClient) {}

  async loadUser(force = false) {
    if (this.loaded && !force) return this.user$.value;
    try {
      const response = await firstValueFrom(this.http.get<any>(this.authUrl('/me')));
      this.user$.next(response.data || null);
    } catch {
      this.user$.next(null);
    }
    this.loaded = true;
    return this.user$.value;
  }

  async login(username: string, password: string) {
    const response = await firstValueFrom(this.http.post<any>(this.authUrl('/login'), { username, password }));
    this.user$.next(response.data || null);
    this.loaded = true;
    return this.user$.value;
  }

  async logout() {
    await firstValueFrom(this.http.post<any>(this.authUrl('/logout'), {}));
    this.user$.next(null);
    this.loaded = true;
  }

  isAdmin(user = this.user$.value) {
    const roles = Array.isArray(user?.roles) ? user.roles : String((user as any)?.roles || '').split(',');
    return roles.map(role => String(role).trim().toLowerCase()).includes('admin');
  }

  private authUrl(path: string) {
    return appUrl(environment.authBaseUrl, `/auth${path.startsWith('/') ? path : `/${path}`}`);
  }
}
