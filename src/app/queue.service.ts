import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../environments/environment';
import { appUrl, wsUrl } from './app-url.util';

@Injectable({ providedIn: 'root' })
export class QueueService {
  readonly events$ = new Subject<any>();
  private ws?: WebSocket;
  private wsGeneration = 0;

  constructor(private http: HttpClient, private zone: NgZone) {}

  locations() { return this.http.get<any>(this.api('/locations')); }
  doctors(location_id: string) { return this.http.get<any>(this.api('/doctors'), { params: { location_id } }); }
  rooms(location_id: string) { return this.http.get<any>(this.api('/rooms'), { params: { location_id } }); }
  doctorRoom(doctor_code: string) { return this.http.get<any>(this.api('/doctor-room'), { params: { doctor_code } }); }
  doctorRooms(doctor_codes: string) { return this.http.get<any>(this.api('/doctor-room'), { params: { doctor_codes } }); }
  queues(location_id: string, doctor_code = '') { return this.http.get<any>(this.api('/queues'), { params: { location_id, doctor_code } }); }
  dashboardSummary() { return this.http.get<any>(this.api('/dashboard/summary')); }
  display(params: Record<string, string>) { return this.http.get<any>(this.api('/display'), { params: new HttpParams({ fromObject: params }) }); }
  displayMulti(room_ids: string) { return this.http.get<any>(this.api('/display-multi'), { params: { room_ids } }); }
  checkQueue(q: string) { return this.http.get<any>(this.api('/check-queue'), { params: { q } }); }
  media(location_id = '', manage = false) {
    const params: Record<string, string> = {};
    if (location_id) params['location_id'] = location_id;
    if (manage) params['manage'] = '1';
    return this.http.get<any>(this.api('/media'), { params });
  }
  uploadMedia(body: FormData) { return this.http.post<any>(this.api('/media'), body); }
  addYoutubeMedia(body: { url: string; label?: string; duration?: number; enabled?: boolean }) { return this.http.post<any>(this.api('/media/youtube'), body); }
  updateMedia(items: any[]) { return this.http.put<any>(this.api('/media'), { items }); }
  toggleMedia(file: string) { return this.http.post<any>(this.api(`/media/${encodeURIComponent(file)}/toggle`), {}); }
  deleteMedia(file: string) { return this.http.delete<any>(this.api(`/media/${encodeURIComponent(file)}`)); }
  saveLocationMedia(locationId: string, files: string[]) { return this.http.put<any>(this.api(`/media/location/${encodeURIComponent(locationId)}`), { files }); }
  saveMediaLocations(file: string, locationIds: string[]) { return this.http.put<any>(this.api(`/media/${encodeURIComponent(file)}/locations`), { location_ids: locationIds }); }
  locationConfigs() { return this.http.get<any>(this.api('/location-configs')); }
  voiceTypes() { return this.http.get<any>(this.api('/location-configs/voice-types')); }
  updateLocationConfig(locationId: string, body: any) { return this.http.put<any>(this.api(`/location-configs/${encodeURIComponent(locationId)}`), body); }
  audioFiles() { return this.http.get<any>(this.api('/audio-files')); }
  uploadAudio(body: FormData) { return this.http.post<any>(this.api('/audio-files'), body); }
  updateAudioFiles(items: any[]) { return this.http.put<any>(this.api('/audio-files'), { items }); }
  deleteAudioFile(file: string) { return this.http.delete<any>(this.api(`/audio-files/${encodeURIComponent(file)}`)); }
  createDisplayDevice(locationId: string, body: any) { return this.http.post<any>(this.api(`/location-configs/${encodeURIComponent(locationId)}/devices`), body); }
  resolveDisplayDevice(token: string) { return this.http.get<any>(this.api('/display-devices/resolve'), { params: { token } }); }
  displayDevice(token: string) { return this.http.get<any>(this.api('/display-devices/display'), { params: { token } }); }
  updateDisplayDevice(deviceId: string, body: any) { return this.http.put<any>(this.api(`/display-devices/${encodeURIComponent(deviceId)}`), body); }
  rotateDisplayDeviceToken(deviceId: string) { return this.http.post<any>(this.api(`/display-devices/${encodeURIComponent(deviceId)}/rotate-token`), {}); }
  deleteDisplayDevice(deviceId: string) { return this.http.delete<any>(this.api(`/display-devices/${encodeURIComponent(deviceId)}`)); }
  call(body: any) { return this.http.post<any>(this.api('/call'), body); }
  hold(body: any) { return this.http.post<any>(this.api('/hold'), body); }
  cancel(body: any) { return this.http.post<any>(this.api('/cancel'), body); }

  connect(topics: string[], options: { deviceToken?: string } = {}) {
    const generation = ++this.wsGeneration;
    this.ws?.close();
    const socket = new WebSocket(wsUrl(environment.wsBaseUrl, '/ws'));
    this.ws = socket;
    socket.onopen = () => {
      if (generation !== this.wsGeneration) return;
      socket.send(JSON.stringify({ type: 'subscribe', topics, deviceToken: options.deviceToken || '' }));
    };
    socket.onmessage = ev => {
      if (generation !== this.wsGeneration) return;
      this.zone.run(() => this.events$.next(JSON.parse(ev.data)));
    };
    socket.onclose = () => {
      if (generation !== this.wsGeneration) return;
      setTimeout(() => {
        if (generation === this.wsGeneration) this.connect(topics, options);
      }, 2000);
    };
  }

  mediaUrl(file: string) { return appUrl(environment.uploadBaseUrl, `/uploads/${file}`); }
  audioAssetUrl(url: string) {
    if (/^https?:\/\//i.test(url)) return url;
    return appUrl(environment.ttsBaseUrl, url.startsWith('/') ? url : `/assets/audio/${url}`);
  }
  ttsUrl(path: string) { return appUrl(environment.ttsBaseUrl, `/tts${path.startsWith('/') ? path : `/${path}`}`); }

  private api(path: string) {
    return appUrl(environment.apiBaseUrl, `/api${path.startsWith('/') ? path : `/${path}`}`);
  }
}
