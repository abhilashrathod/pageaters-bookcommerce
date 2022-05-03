import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';

import {IResponse} from '../schema/responses';

import {environment} from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class AuthorService {

  constructor(private _http: HttpClient) {
  }

  authenticate(payload): Observable<any> {
    const url = `${environment.BASE_PATH}/auth/login`;
    return this._http.post(url, payload)
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  handleError(err: any): any {
    return throwError(err.error);
  }
}
