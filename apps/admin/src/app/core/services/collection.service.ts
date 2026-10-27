import {Injectable} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {environment} from '../../../environments/environment';
import {HttpClient, HttpParams} from '@angular/common/http';
import {catchError, map} from 'rxjs/operators';
import {IResponse} from '../schema/responses';

@Injectable({
  providedIn: 'root'
})
export class CollectionService {

  constructor(private _http: HttpClient) {
  }

  getAllCollections(filters): Observable<any> {
    const url = `${environment.BASE_PATH}/collections`;
    let params = new HttpParams();
    params = params.append('page', filters.page);
    params = params.append('limit', filters.limit);
    return this._http.get(url, {params})
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  searchCollections(title): Observable<any> {
    const url = `${environment.BASE_PATH}/collections/search/${title}`;
    return this._http.get(url)
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  create(payload): Observable<any> {
    const url = `${environment.BASE_PATH}/collections`;
    return this._http.post(url, payload)
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  getById(id): Observable<any> {
    const url = `${environment.BASE_PATH}/collections/${id}`;
    return this._http.get(url)
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  getByUniqueId(id): Observable<any> {
    const url = `${environment.BASE_PATH}/collections/unique/${id}`;
    return this._http.get(url)
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }


  update(id, payload): Observable<any> {
    const url = `${environment.BASE_PATH}/collections/${id}`;
    return this._http.put(url, payload)
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  handleError(err: any): any {
    return throwError(err.error);
  }
}
