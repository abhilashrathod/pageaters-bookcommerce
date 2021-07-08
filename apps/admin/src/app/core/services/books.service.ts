import {Injectable} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {HttpClient, HttpParams} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {IResponse} from '../schema/responses';


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
    const url = `${environment.BASE_PATH}/store-books/search/${title}`;
    return this._http.get(url)
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



  handleError(err: any): any {
    return throwError(err.error);
  }
}
