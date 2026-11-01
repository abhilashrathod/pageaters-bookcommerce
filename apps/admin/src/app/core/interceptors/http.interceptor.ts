import {Injectable} from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import {Router} from '@angular/router';

import {Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';


@Injectable()
export class Interceptor implements HttpInterceptor {

  constructor(private router: Router) {

  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    // setting default headers
    let headers = req.headers;
    headers = headers.append('Content-Type', 'application/json');

    // making the request changes
    const request = req.clone({headers, withCredentials: true});
    return next.handle(request)
      .pipe(
        map((event: HttpEvent<any>) => {
          if (event instanceof HttpResponse) {
            return event;
          }
        }),
        catchError((err: any) => {
          if (err instanceof HttpErrorResponse) {
            if (err.status === 403 || err.status === 401) {
              this.router.navigate(['/']);
              return throwError(err.error);
            }
          }
          return throwError(err.error);
        })
      );
  }

}
