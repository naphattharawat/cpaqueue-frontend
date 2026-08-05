import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, AuthUser } from './auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="portal">
      <button class="portal-logout" (click)="logout()"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
      <section class="portal-head">
        <i class="fa-solid fa-hospital-user"></i>
        <h1>ระบบคิวผู้ป่วยนอก</h1>
        <p>{{user?.displayName || 'OPD Queue System'}}</p>
      </section>
      <nav class="portal-grid">
        <a routerLink="/caller" class="portal-card"><i class="fa-solid fa-laptop-medical"></i><strong>Doctor Queue Caller</strong><span>เรียกคิวและจัดการสถานะ</span></a>
        <a *ngIf="isAdmin" routerLink="/dashboard" class="portal-card"><i class="fa-solid fa-chart-line"></i><strong>Dashboard</strong><span>สรุป login และการเรียกคิวประจำวัน</span></a>
        <a *ngIf="isAdmin" routerLink="/check-queue" class="portal-card"><i class="fa-solid fa-magnifying-glass"></i><strong>Check Queue</strong><span>ตรวจสอบสถานะคิวสำหรับผู้ป่วย</span></a>
        <a *ngIf="isAdmin" routerLink="/media-manager" class="portal-card"><i class="fa-solid fa-images"></i><strong>Media Manager</strong><span>จัดการภาพสไลด์บนหน้าจอรวม</span></a>
        <a *ngIf="isAdmin" routerLink="/service-settings" class="portal-card"><i class="fa-solid fa-sliders"></i><strong>Service Settings</strong><span>ตั้งค่าจุดบริการ เสียง และ device token</span></a>
        <a *ngIf="isAdmin" routerLink="/audio-settings" class="portal-card"><i class="fa-solid fa-file-audio"></i><strong>Audio Settings</strong><span>อัปโหลด ตั้งชื่อ และทดสอบไฟล์เสียง</span></a>
      </nav>
    </main>
  `,
})
export class PortalComponent implements OnInit {
  user: AuthUser | null = null;

  constructor(private auth: AuthService, private router: Router) {}

  get isAdmin() {
    return this.auth.isAdmin(this.user);
  }

  async ngOnInit() {
    this.user = await this.auth.loadUser();
    if (this.user && !this.isAdmin) await this.router.navigateByUrl('/caller');
  }

  async logout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
