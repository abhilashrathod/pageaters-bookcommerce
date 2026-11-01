import {Injectable} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {environment} from '@env/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import {catchError, map} from 'rxjs/operators';
import {IResponse} from '@schema/responses';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  constructor(private _http: HttpClient) {
  }

  getAllCategories(filters): Observable<any> {
    const url = `${environment.BASE_PATH}/categories`;
    let params = new HttpParams();
    params = params.append('page', filters.page);
    params = params.append('limit', filters.limit);
    return this._http.get(url, {params})
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  searchCategories(title): Observable<any> {
    const url = `${environment.BASE_PATH}/categories/search/${title}`;
    return this._http.get(url)
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  create(payload): Observable<any> {
    const url = `${environment.BASE_PATH}/categories`;
    return this._http.post(url, payload)
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  getById(id): Observable<any> {
    const url = `${environment.BASE_PATH}/categories/${id}`;
    return this._http.get(url)
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  getByUniqueId(id): Observable<any> {
    const url = `${environment.BASE_PATH}/categories/unique/${id}`;
    return this._http.get(url)
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }


  update(id, payload): Observable<any> {
    const url = `${environment.BASE_PATH}/categories/${id}`;
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
