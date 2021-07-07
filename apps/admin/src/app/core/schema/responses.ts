export interface IPaginationResponse {
  docs: Array<any>;
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: any;
  nextPage: any;
}

export interface IResponse {
  statusCode: number;
  status: string;
  message: string;
  data: any;
}
