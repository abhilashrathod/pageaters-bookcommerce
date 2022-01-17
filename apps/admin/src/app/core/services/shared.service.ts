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
    params = params.set('sortBy', filters.sortBy);
    params = params.set('sortOrder', filters.sortOrder);
    return this.httpClient.get(url, {params})
      .pipe(
        map((res: IResponse) => res.data),
        catchError(err => this.handleError(err))
      );
  }

  search(url, query): Observable<any> {
    url = `${environment.BASE_PATH}${url}/${query}`;
    return this.httpClient.get(url)
      .pipe(
        map((res: IResponse) => res.data),
        catchError(err => this.handleError(err))
      );
  }

  destroy(url, id): Observable<any> {
    url = `${environment.BASE_PATH}${url}/${id}`;
    return this.httpClient.delete(url);
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
