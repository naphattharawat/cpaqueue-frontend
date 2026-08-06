import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QueueService } from './queue.service';
import { appRouteUrl } from './app-url.util';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="admin-dashboard">
      <header class="dashboard-header">
        <a [href]="appRouteUrl('/')" class="icon-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <div>
          <h1>Dashboard</h1>
          <span>สรุปการใช้งานประจำวัน {{summary?.date || ''}}</span>
        </div>
        <label class="dashboard-refresh">
          <i class="fa-solid fa-clock-rotate-left"></i>
          <select [(ngModel)]="refreshSeconds" (change)="setRefreshTimer()">
            <option [ngValue]="0">ไม่ refresh auto</option>
            <option [ngValue]="3">auto 3s</option>
            <option [ngValue]="5">auto 5s</option>
            <option [ngValue]="10">auto 10s</option>
            <option [ngValue]="30">auto 30s</option>
            <option [ngValue]="60">auto 60s</option>
          </select>
        </label>
        <button class="btn" (click)="load()"><i class="fa-solid fa-rotate"></i> Refresh</button>
      </header>

      <section class="dashboard-cards" *ngIf="summary">
        <article class="login-card"><i class="fa-solid fa-users"></i><small>Login users วันนี้</small><strong>{{summary.login_users_today || 0}}</strong></article>
        <article class="login-card attempt"><i class="fa-solid fa-right-to-bracket"></i><small>Login attempts</small><strong>{{summary.login_attempts_today || 0}}</strong></article>
        <article class="login-card failed"><i class="fa-solid fa-triangle-exclamation"></i><small>Login failed</small><strong>{{summary.failed_logins_today || 0}}</strong></article>
        <article class="call-card"><i class="fa-solid fa-bullhorn"></i><small>เรียกคิว</small><strong>{{callCount('call')}}</strong></article>
        <article class="call-card hold"><i class="fa-solid fa-user-clock"></i><small>ไม่พบ / รอผล</small><strong>{{callCount('hold')}}</strong></article>
        <article class="call-card cancel"><i class="fa-solid fa-ban"></i><small>ยกเลิก</small><strong>{{callCount('cancel')}}</strong></article>
      </section>

      <section class="dashboard-grid" *ngIf="summary">
        <article class="dashboard-panel">
          <h2>ห้องที่มีการเรียกคิววันนี้</h2>
          <table>
            <thead>
              <tr><th>จุดบริการ</th><th>ห้อง</th><th>จำนวน</th><th>เรียกล่าสุด</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of summary.active_rooms_today">
                <td>{{r.location_name || '-'}}</td>
                <td>#{{r.room_number || r.room_id}} {{r.room_name || ''}}</td>
                <td>{{r.call_count || 0}}</td>
                <td>{{time(r.last_called_at)}}</td>
              </tr>
              <tr *ngIf="!summary.active_rooms_today?.length"><td colspan="4">ยังไม่มีการเรียกคิววันนี้</td></tr>
            </tbody>
          </table>
        </article>

        <article class="dashboard-panel">
          <h2>รายการล่าสุด</h2>
          <table>
            <thead>
              <tr><th>เวลา</th><th>Action</th><th>คิว</th><th>ห้อง</th><th>ผู้เรียก</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of summary.recent_calls">
                <td>{{time(c.logged_at)}}</td>
                <td><span class="action-pill" [class.hold]="c.action === 'hold'" [class.cancel]="c.action === 'cancel'">{{c.action}}</span></td>
                <td>{{c.oqueue || c.queue_no || '-'}}</td>
                <td>#{{c.room_number || ''}} {{c.room_name || ''}}</td>
                <td>{{c.caller_display_name || '-'}}</td>
              </tr>
              <tr *ngIf="!summary.recent_calls?.length"><td colspan="5">ยังไม่มีรายการวันนี้</td></tr>
            </tbody>
          </table>
        </article>
      </section>

      <p class="empty-row" *ngIf="!summary && !loading">โหลด dashboard ไม่สำเร็จ</p>
      <footer class="dashboard-footer" *ngIf="lastLoadedAt">ดึงข้อมูลล่าสุด {{lastLoadedAt}}</footer>
    </main>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  appRouteUrl = appRouteUrl;
  summary: any = null;
  loading = false;
  lastLoadedAt = '';
  refreshSeconds = Number(localStorage.getItem('dashboard_refresh_seconds') || 0);
  private refreshTimer?: number;

  constructor(private api: QueueService) {}

  ngOnInit() {
    this.load();
    this.setRefreshTimer();
  }

  ngOnDestroy() {
    if (this.refreshTimer) window.clearInterval(this.refreshTimer);
  }

  load() {
    this.loading = true;
    this.api.dashboardSummary().subscribe({
      next: r => {
        this.summary = r.data;
        this.lastLoadedAt = new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'medium' });
        this.loading = false;
      },
      error: err => {
        console.warn('Dashboard load failed', err);
        this.loading = false;
      },
    });
  }

  setRefreshTimer() {
    if (this.refreshTimer) window.clearInterval(this.refreshTimer);
    localStorage.setItem('dashboard_refresh_seconds', String(this.refreshSeconds));
    if (this.refreshSeconds > 0) {
      this.refreshTimer = window.setInterval(() => this.load(), this.refreshSeconds * 1000);
    }
  }

  callCount(action: string) {
    return Number(this.summary?.call_counts_today?.[action] || 0);
  }

  time(value: string) {
    return value ? new Date(value).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
  }
}
