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
          <input [(ngModel)]="query" (keyup.enter)="check()" placeholder="กรอกหมายเลขคิว O">
          <button (click)="check()">ตรวจสอบ</button>
        </div>
        <div class="result-card" *ngIf="result">
          <strong>{{result.oqueue || result.queue_no}}</strong>
          <span>{{result.patient_name}}</span>
          <b [class.done]="result.call_status==='N'" [class.wait]="result.call_status==='Y'">{{statusText(result.call_status)}}</b>
          <p>{{message}}</p>
          <small>{{result.room_name}}</small>
        </div>
        <p class="error" *ngIf="error">{{error}}</p>
      </section>
    </main>
  `,
})
export class CheckQueueComponent {
  query = '';
  result: any = null;
  error = '';
  message = '';

  constructor(private api: QueueService) {}

  check() {
    this.api.checkQueue(this.query).subscribe(r => {
      this.result = r.data || null;
      this.error = r.status === 'success' ? '' : r.message;
      this.message = this.result?.call_status === 'Y'
        ? (this.result.remaining === 0 ? 'คุณเป็นคิวถัดไป เตรียมตัวเข้าตรวจ' : `อีก ${this.result.remaining} คิวถึงคุณ`)
        : this.result?.call_status === 'N'
          ? 'ถึงคิวของคุณแล้ว'
          : this.result?.call_status === 'F'
            ? 'เลยคิวของคุณแล้ว กรุณาติดต่อเจ้าหน้าที่'
            : 'อยู่ในสถานะรอผล/ไม่พบ';
    });
  }

  statusText(s: string) {
    return s === 'N' ? 'เรียกแล้ว' : s === 'F' ? 'เลยคิว' : s === 'W' ? 'ไม่พบ/รอผล' : 'รอเรียก';
  }
}
