import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="login-screen">
      <section class="login-card">
        <i class="fa-solid fa-hospital-user"></i>
        <h1>เข้าสู่ระบบ</h1>
        <p>OPD Queue System</p>
        <form (ngSubmit)="submit()">
          <label>Username
            <input [(ngModel)]="username" name="username" autocomplete="username" autofocus>
          </label>
          <label>Password
            <input [(ngModel)]="password" name="password" type="password" autocomplete="current-password">
          </label>
          <button class="btn" [disabled]="loading">{{loading ? 'กำลังเข้าสู่ระบบ...' : 'Login'}}</button>
          <small class="error" *ngIf="error">{{error}}</small>
        </form>
      </section>
    </main>
  `,
})
export class LoginComponent {
  username = '';
  password = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  async submit() {
    if (!this.username || !this.password || this.loading) return;
    this.loading = true;
    this.error = '';
    try {
      const user = await this.auth.login(this.username, this.password);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      const isAdmin = !!user?.roles.includes('admin');
      const target = this.loginTarget(returnUrl, isAdmin);
      await this.router.navigateByUrl(target);
    } catch {
      this.error = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    } finally {
      this.loading = false;
    }
  }

  private loginTarget(returnUrl: string | null, isAdmin: boolean) {
    if (!returnUrl || returnUrl === '/login') return isAdmin ? '/' : '/caller';
    if (isAdmin && (returnUrl === '/caller' || returnUrl === '/caller-mobile')) return '/';
    return returnUrl;
  }
}
