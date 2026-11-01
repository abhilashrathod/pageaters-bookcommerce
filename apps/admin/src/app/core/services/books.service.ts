import {Injectable} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import {environment} from '@env/environment';
import {catchError, map} from 'rxjs/operators';
import {IResponse} from '@schema/responses';


@Injectable({
  providedIn: 'root'
})
export class BooksService {

  constructor(private _http: HttpClient) {
  }

  getAllBooks(filters): Observable<any> {
    const url = `${environment.BASE_PATH}/store-books`;
    let params = new HttpParams();
    params = params.append('page', filters.page);
    params = params.append('limit', filters.limit);
    return this._http.get(url, {params})
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  searchBooks(title): Observable<any> {
    const url = `${environment.BASE_PATH}/store-books/search`;
    let params = new HttpParams();
    params = params.append('q', title);
    return this._http.get(url, {params})
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  create(payload): Observable<any> {
    const url = `${environment.BASE_PATH}/store-books`;
    return this._http.post(url, payload)
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }


  getById(id): Observable<any> {
    const url = `${environment.BASE_PATH}/store-books/get/${id}`;
    return this._http.get(url)
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  getByUniqueId(id): Observable<any> {
    const url = `${environment.BASE_PATH}/store-books/unique/${id}`;
    return this._http.get(url)
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }


  update(id, payload): Observable<any> {
    const url = `${environment.BASE_PATH}/store-books/${id}`;
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
