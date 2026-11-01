import {Injectable} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

import {IResponse} from '@schema/responses';

import {environment} from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class CartService {

  constructor(private _http: HttpClient) {
  }

  getById(id): Observable<any> {
    const url = `${environment.BASE_PATH}/cart/${id}`;
    return this._http.get(url)
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  handleError(err: any): any {
    return throwError(err.error);
  }
}
