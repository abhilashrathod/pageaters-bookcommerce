import { enableProdMode, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { environment } from './environments/environment';
import { HTTP_INTERCEPTORS, provideHttpClient, withXhr, withInterceptorsFromDi } from '@angular/common/http';
import { Interceptor } from './app/core/interceptors/http.interceptor';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { AppRoutingModule } from './app/app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SortablejsModule } from '@dustfoundation/ngx-sortablejs';
import { AppComponent } from './app/app.component';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(BrowserModule, AppRoutingModule, BrowserAnimationsModule, SortablejsModule.forRoot({ animation: 150 })),
    { provide: HTTP_INTERCEPTORS, useClass: Interceptor, multi: true },
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
  ],
}).catch((err) => console.error(err));
