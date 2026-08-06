import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QueueService } from './queue.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="check-screen">
      <section class="check-card">
        <i class="fa-solid fa-magnifying-glass"></i>
        <h1>ตรวจสอบคิว</h1>
        <div class="check-form">
          <input [(ngModel)]="query" (keyup.enter)="check()" placeholder="กรอกหมายเลขคิว">
          <button (click)="check()">ตรวจสอบ</button>
        </div>

        <div class="queue-summary" *ngIf="results.length">
          <span>หมายเลขคิว</span>
          <strong>{{primaryQueueNo}}</strong>
          <small>{{patientName}}</small>
        </div>

        <div class="result-list" *ngIf="results.length">
          <article class="result-card detail-card" *ngFor="let result of results">
            <div class="detail-main">
              <div>
                <span class="detail-label">{{result.location_name || 'จุดบริการ'}}</span>
                <strong>{{roomText(result)}}</strong>
              </div>
              <b [class.done]="result.call_status==='N'" [class.wait]="result.call_status==='Y'">{{statusText(result.call_status)}}</b>
            </div>
            <p>{{messageFor(result)}}</p>
          </article>
        </div>

        <p class="error" *ngIf="error">{{error}}</p>
      </section>
    </main>
  `,
})
export class CheckQueueComponent {
  query = '';
  result: any = null;
  results: any[] = [];
  error = '';
  message = '';

  constructor(private api: QueueService) {}

  get primaryQueueNo() {
    return this.result?.oqueue || this.result?.queue_no || '-';
  }

  get patientName() {
    return this.result?.patient_name || '';
  }

  check() {
    this.api.checkQueue(this.query).subscribe(r => {
      this.results = Array.isArray(r.queues) ? r.queues : (r.data ? [r.data] : []);
      this.result = this.results[0] || null;
      this.error = r.status === 'success' ? '' : r.message;
      this.message = this.result ? this.messageFor(this.result) : '';
    });
  }

  roomText(result: any) {
    const room = result?.room_name || 'ห้อง/จุดบริการ';
    const number = result?.room_number ? ` #${result.room_number}` : '';
    return `${room}${number}`;
  }

  messageFor(result: any) {
    return result?.call_status === 'Y'
      ? (result.remaining === 0 ? 'คุณเป็นคิวถัดไป เตรียมตัวเข้ารับบริการ' : `อีก ${result.remaining} คิวถึงคุณ`)
      : result?.call_status === 'N'
        ? 'ถึงคิวของคุณแล้ว'
        : result?.call_status === 'F'
          ? 'เลยคิวของคุณแล้ว กรุณาติดต่อเจ้าหน้าที่'
          : 'อยู่ในสถานะรอผล/ไม่พบ';
  }

  statusText(s: string) {
    return s === 'N' ? 'เรียกแล้ว' : s === 'F' ? 'เลยคิว' : s === 'W' ? 'ไม่พบ/รอผล' : 'รอเรียก';
  }
}
