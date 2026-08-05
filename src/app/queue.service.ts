import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class QueueService {
  readonly events$ = new Subject<any>();
  private ws?: WebSocket;

  constructor(private http: HttpClient, private zone: NgZone) {}

  locations() { return this.http.get<any>('/api/locations'); }
  doctors(location_id: string) { return this.http.get<any>('/api/doctors', { params: { location_id } }); }
  rooms(location_id: string) { return this.http.get<any>('/api/rooms', { params: { location_id } }); }
  doctorRoom(doctor_code: string) { return this.http.get<any>('/api/doctor-room', { params: { doctor_code } }); }
  doctorRooms(doctor_codes: string) { return this.http.get<any>('/api/doctor-room', { params: { doctor_codes } }); }
  queues(location_id: string, doctor_code = '') { return this.http.get<any>('/api/queues', { params: { location_id, doctor_code } }); }
  display(params: Record<string, string>) { return this.http.get<any>('/api/display', { params: new HttpParams({ fromObject: params }) }); }
  displayMulti(room_ids: string) { return this.http.get<any>('/api/display-multi', { params: { room_ids } }); }
  checkQueue(q: string) { return this.http.get<any>('/api/check-queue', { params: { q } }); }
  media(location_id = '', manage = false) {
    const params: Record<string, string> = {};
    if (location_id) params['location_id'] = location_id;
    if (manage) params['manage'] = '1';
    return this.http.get<any>('/api/media', { params });
  }
  uploadMedia(body: FormData) { return this.http.post<any>('/api/media', body); }
  updateMedia(items: any[]) { return this.http.put<any>('/api/media', { items }); }
  toggleMedia(file: string) { return this.http.post<any>(`/api/media/${encodeURIComponent(file)}/toggle`, {}); }
  deleteMedia(file: string) { return this.http.delete<any>(`/api/media/${encodeURIComponent(file)}`); }
  saveLocationMedia(locationId: string, files: string[]) { return this.http.put<any>(`/api/media/location/${encodeURIComponent(locationId)}`, { files }); }
  saveMediaLocations(file: string, locationIds: string[]) { return this.http.put<any>(`/api/media/${encodeURIComponent(file)}/locations`, { location_ids: locationIds }); }
  locationConfigs() { return this.http.get<any>('/api/location-configs'); }
  voiceTypes() { return this.http.get<any>('/api/location-configs/voice-types'); }
  updateLocationConfig(locationId: string, body: any) { return this.http.put<any>(`/api/location-configs/${encodeURIComponent(locationId)}`, body); }
  audioFiles() { return this.http.get<any>('/api/audio-files'); }
  uploadAudio(body: FormData) { return this.http.post<any>('/api/audio-files', body); }
  updateAudioFiles(items: any[]) { return this.http.put<any>('/api/audio-files', { items }); }
  deleteAudioFile(file: string) { return this.http.delete<any>(`/api/audio-files/${encodeURIComponent(file)}`); }
  createDisplayDevice(locationId: string, body: any) { return this.http.post<any>(`/api/location-configs/${encodeURIComponent(locationId)}/devices`, body); }
  resolveDisplayDevice(token: string) { return this.http.get<any>('/api/display-devices/resolve', { params: { token } }); }
  displayDevice(token: string) { return this.http.get<any>('/api/display-devices/display', { params: { token } }); }
  updateDisplayDevice(deviceId: string, body: any) { return this.http.put<any>(`/api/display-devices/${encodeURIComponent(deviceId)}`, body); }
  rotateDisplayDeviceToken(deviceId: string) { return this.http.post<any>(`/api/display-devices/${encodeURIComponent(deviceId)}/rotate-token`, {}); }
  deleteDisplayDevice(deviceId: string) { return this.http.delete<any>(`/api/display-devices/${encodeURIComponent(deviceId)}`); }
  call(body: any) { return this.http.post<any>('/api/call', body); }
  hold(body: any) { return this.http.post<any>('/api/hold', body); }
  cancel(body: any) { return this.http.post<any>('/api/cancel', body); }

  connect(topics: string[]) {
    this.ws?.close();
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws.onopen = () => this.ws?.send(JSON.stringify({ type: 'subscribe', topics }));
    this.ws.onmessage = ev => this.zone.run(() => this.events$.next(JSON.parse(ev.data)));
    this.ws.onclose = () => setTimeout(() => this.connect(topics), 2000);
  }
}
