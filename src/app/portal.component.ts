import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="portal">
      <section class="portal-head">
        <i class="fa-solid fa-hospital-user"></i>
        <h1>ระบบคิวผู้ป่วยนอก</h1>
        <p>OPD Queue System</p>
      </section>
      <nav class="portal-grid">
        <a routerLink="/caller" class="portal-card"><i class="fa-solid fa-laptop-medical"></i><strong>Doctor Queue Caller</strong><span>เรียกคิวและจัดการสถานะ</span></a>
        <a routerLink="/check-queue" class="portal-card"><i class="fa-solid fa-magnifying-glass"></i><strong>Check Queue</strong><span>ตรวจสอบสถานะคิวสำหรับผู้ป่วย</span></a>
        <a routerLink="/media-manager" class="portal-card"><i class="fa-solid fa-images"></i><strong>Media Manager</strong><span>จัดการภาพสไลด์บนหน้าจอรวม</span></a>
        <a routerLink="/service-settings" class="portal-card"><i class="fa-solid fa-sliders"></i><strong>Service Settings</strong><span>ตั้งค่าจุดบริการ เสียง และ device token</span></a>
        <a routerLink="/audio-settings" class="portal-card"><i class="fa-solid fa-file-audio"></i><strong>Audio Settings</strong><span>อัปโหลด ตั้งชื่อ และทดสอบไฟล์เสียง</span></a>
      </nav>
    </main>
  `,
})
export class PortalComponent {}
