import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([(req, next) => {
      const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      const csrf = unsafe ? readCookie('cpaqueue.csrf') : '';
      return next(req.clone({
        withCredentials: true,
        setHeaders: csrf ? { 'X-CSRF-Token': csrf } : {},
      }));
    }])),
    provideRouter(routes),
  ],
}).catch(err => console.error(err));

function readCookie(name: string) {
  return document.cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || '';
}
