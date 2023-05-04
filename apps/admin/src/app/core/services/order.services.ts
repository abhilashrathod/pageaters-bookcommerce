import {Injectable} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {environment} from '../../../environments/environment';
import {HttpClient, HttpParams} from '@angular/common/http';
import {catchError, map} from 'rxjs/operators';
import {IResponse} from '../schema/responses';

@Injectable({
  providedIn: 'root'
})
export class OrderServices {

  constructor(private _http: HttpClient) {
  }

  getAllOrders(filters): Observable<any> {
    const url = `${environment.BASE_PATH}/orders`;
    let params = new HttpParams();
    params = params.append('page', filters.page);
    params = params.append('limit', filters.limit);
    return this._http.get(url, {params})
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  getById(id): Observable<any> {
    const url = `${environment.BASE_PATH}/orders/getById/${id}`;
    return this._http.get(url)
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  /** FORWARD SHIPMENT **/
  ship(payload): Observable<any> {
    const url = `${environment.BASE_PATH}/orders/ship`;
    return this._http.post(url, payload)
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  fulfilled(orderId: string): Observable<any> {
    const url = `${environment.BASE_PATH}/orders/ship/${orderId}/complete`;
    return this._http.patch(url, {})
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  /** RETURN / REPLACEMENT SHIPMENTS **/

  alignReturnShipment(orderId: string, requestId: string, payload: any): Observable<any> {
    const url = `${environment.BASE_PATH}/orders/return/${orderId}/shipment/${requestId}`;
    return this._http.patch(url, payload)
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  closeReturnShipment(orderId: string, requestId: string): Observable<any> {
    const url = `${environment.BASE_PATH}/orders/return/${orderId}/shipment/${requestId}/close`;
    return this._http.patch(url, {})
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  closeReplacementShipment(orderId: string, requestId: string): Observable<any> {
    const url = `${environment.BASE_PATH}/orders/replace/${orderId}/shipment/${requestId}/close`;
    return this._http.patch(url, {})
      .pipe(
        map((dt: IResponse) => dt.data),
        catchError((err) => this.handleError(err))
      );
  }

  issueStoreCredit(payload: any): Observable<any> {
    const url = `${environment.BASE_PATH}/store-credit`;
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
