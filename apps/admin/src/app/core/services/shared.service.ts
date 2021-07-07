import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';

import {environment} from '../../../environments/environment';
import {IResponse} from '../schema/responses';

@Injectable({
  providedIn: 'root'
})
export class SharedService {

  constructor(private httpClient: HttpClient) {
  }

  getAll(url, filters): Observable<any> {
    url = environment.BASE_PATH + url;
    let params = new HttpParams();
    params = params.set('limit', filters.limit);
    params = params.set('page', filters.page);
    return this.httpClient.get(url, {params})
      .pipe(
        map((res: IResponse) => res.data),
        catchError(err => this.handleError(err))
      );
  }

  destroy(url, payload?): Observable<any> {
    url = environment.BASE_PATH + url;
    return this.httpClient.delete(url, payload);
  }

  put(url, payload?): Observable<any> {
    url = environment.BASE_PATH + url;
    return this.httpClient.put(url, payload)
      .pipe(
        map((res: IResponse) => res.data),
        catchError(err => this.handleError(err))
      );
  }

  handleError(err: any): any {
    return throwError(err.error);
  }
}
