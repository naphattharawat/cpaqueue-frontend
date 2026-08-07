import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { QueueService } from './queue.service';
import { appRouteUrl } from './app-url.util';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="room-list-display-page">
      <header class="multi-display-header">
        <div class="multi-title-group">
          <a [href]="appRouteUrl('/')" class="multi-logo"><i class="fa-solid fa-hospital"></i></a>
          <h1>{{title}}</h1>
        </div>
        <div class="multi-clock">เวลา&nbsp; {{clock}} <span>{{dateText}}</span></div>
        <div class="multi-tools">
          <button title="เต็มจอ" (click)="toggleFullScreen()"><i class="fa-solid fa-expand"></i></button>
        </div>
      </header>

      <section class="multi-setup legacy room-list-setup" *ngIf="!roomIds">
        <label>
          <span>จุดบริการ</span>
          <select [(ngModel)]="locationId" (change)="loadRooms()">
            <option value="">-- เลือกจุดบริการ --</option>
            <option *ngFor="let l of locations" [value]="l.opd_qs_location_id">{{l.opd_qs_location_name}}</option>
          </select>
        </label>
        <label>
          <span>จำนวนคิวต่อห้อง</span>
          <select [(ngModel)]="limit">
            <option *ngFor="let n of [3,5,6,7,10,12]" [ngValue]="n">{{n}} คิว</option>
          </select>
        </label>
        <div class="room-pick">
          <label *ngFor="let r of rooms">
            <input type="checkbox" [value]="r.opd_qs_room_id" (change)="toggleRoom(r.opd_qs_room_id, $any($event.target).checked)">
            ห้อง #{{r.opd_qs_room_number || r.opd_qs_room_id}} {{r.opd_qs_room_name}}
          </label>
        </div>
        <button class="btn" [disabled]="!picked.size" (click)="startBoard()">
          <i class="fa-solid fa-table-cells-large"></i> เปิดหน้าจอแสดงคิวหลายรายการ
        </button>
      </section>

      <section class="room-list-board" *ngIf="roomIds" [ngStyle]="boardStyle">
        <article class="room-list-card" *ngFor="let room of roomsData" [class.has-queue]="room.queues?.length">
          <div class="room-list-room">
            <span>ห้อง</span>
            <strong>{{room.room_number || room.room_id}}</strong>
            <small>{{room.room_name}}</small>
          </div>
          <div class="room-list-queues">
            <div class="room-list-queue" *ngFor="let q of room.queues; let i = index" [class.latest]="i === 0">
              <strong>{{displayNo(q)}}</strong>
              <small>{{timeText(q.call_datetime)}}</small>
            </div>
            <div class="room-list-empty" *ngIf="!room.queues?.length">---</div>
          </div>
        </article>
      </section>

      <footer class="multi-display-footer">
        <span></span>
        <span>แสดง {{limit}} คิวล่าสุดต่อห้อง</span>
        <span>กลุ่มภารกิจสุขภาพดิจิทัล โรงพยาบาลเจ้าพระยาอภัยภูเบศร</span>
      </footer>
    </main>
  `,
})
export class RoomListDisplayComponent implements OnInit {
  locationId = '';
  locations: any[] = [];
  rooms: any[] = [];
  picked = new Set<string>();
  roomIds = '';
  limit = 6;
  roomsData: any[] = [];
  title = 'หน้าจอแสดงคิวหลายรายการต่อห้อง';
  clock = '';
  dateText = '';
  queueType = localStorage.getItem('display_queue_type') || 'oqueue';

  constructor(private route: ActivatedRoute, private api: QueueService) {}

  appRouteUrl = appRouteUrl;

  get boardStyle() {
    const count = Math.max(1, this.roomsData.length || this.roomIds.split(',').filter(Boolean).length || 1);
    const columns = count === 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : count <= 16 ? 4 : 5;
    return {
      '--room-count': String(count),
      '--room-columns': String(columns),
    };
  }

  ngOnInit() {
    this.api.locations().subscribe(r => this.locations = r.data || []);
    this.route.queryParamMap.subscribe(p => {
      this.locationId = p.get('location_id') || '';
      this.roomIds = this.uniqueRoomIds(p.get('room_ids') || '');
      this.limit = Math.min(12, Math.max(1, Number(p.get('limit') || this.limit) || 6));
      if (this.roomIds) {
        this.loadBoard();
        this.api.connect(this.roomIds.split(',').map(id => `room:${id}`));
      } else if (this.locationId) {
        this.loadRooms();
      }
    });
    this.api.events$.subscribe(e => {
      if (e.type === 'queue.changed' && this.roomIds) this.loadBoard();
    });
    setInterval(() => this.tick(), 1000);
    this.tick();
  }

  uniqueRoomIds(ids: string) {
    return [...new Set(ids.split(',').map(id => id.trim()).filter(Boolean))].join(',');
  }

  loadRooms() {
    if (!this.locationId) return;
    this.api.rooms(this.locationId).subscribe(r => this.rooms = r.data || []);
  }

  toggleRoom(id: string, checked: boolean) {
    checked ? this.picked.add(String(id)) : this.picked.delete(String(id));
  }

  startBoard() {
    this.roomIds = this.uniqueRoomIds([...this.picked].join(','));
    if (!this.roomIds) return;
    history.replaceState(null, '', appRouteUrl(`/display-room-list?location_id=${this.locationId}&room_ids=${this.roomIds}&limit=${this.limit}`));
    this.loadBoard();
    this.api.connect(this.roomIds.split(',').map(id => `room:${id}`));
  }

  loadBoard() {
    this.api.displayRoomList(this.roomIds, this.limit).subscribe(r => {
      this.roomsData = r.rooms_data || [];
      this.title = this.roomsData[0]?.location_name ? `หน้าจอแสดงคิว ${this.roomsData[0].location_name}` : 'หน้าจอแสดงคิวหลายรายการต่อห้อง';
    });
  }

  displayNo(q: any) {
    if (!q) return '---';
    if (this.queueType === 'oqueue') return q.oqueue || q.queue_no || q.queue_slot_number || '---';
    return q.queue_slot_number || q.queue_no || q.oqueue || '---';
  }

  timeText(value: string) {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toTimeString().slice(0, 5);
  }

  tick() {
    const n = new Date();
    this.clock = n.toTimeString().slice(0, 8);
    this.dateText = n.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  toggleFullScreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
}
