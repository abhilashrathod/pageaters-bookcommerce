import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { SortablejsModule } from '@dustfoundation/ngx-sortablejs';

import { Interceptor } from './core/interceptors/http.interceptor';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  declarations: [AppComponent],
  bootstrap: [AppComponent],
  imports: [BrowserModule, AppRoutingModule, BrowserAnimationsModule, SortablejsModule.forRoot({ animation: 150 })],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: Interceptor, multi: true }, provideHttpClient(withXhr(), withInterceptorsFromDi())],
})
export class AppModule {}
