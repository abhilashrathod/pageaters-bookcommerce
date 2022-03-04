import axios, {AxiosResponse} from 'axios'

export const getError = (error: any) => {
  if (error.isAxiosError && error.response) return error.response.data;
  return 'Unexpected error'
};

export const refreshTokens = async () => {
  await axios.post(`${process.env.NEXT_PUBLIC_BASE_PATH}/auth/refresh-token`, {}, {withCredentials: true})
};

const handleRequest = async (request: () => Promise<AxiosResponse>): Promise<AxiosResponse> => {
  try {
    return await request()
  } catch (error: any) {
    if (error?.response?.status === 401) {
      try {
        await refreshTokens();

        return await request()
      } catch (innerError) {
        throw getError(innerError)
      }
    }

    throw getError(error)
  }
};

/* GET REQUEST WRAPPER */
export const fetcher = async <T>(url: string): Promise<[any, null]> => {
  try {
    const request = () => axios.get(url, {withCredentials: true});
    const {data} = await handleRequest(request);
    return [null, data.data]
  } catch (error) {
    return [error, null]
  }
};

/* POST REQUEST WRAPPER */
export const poster = async <T>(url: string, payload?: unknown): Promise<[any, null]> => {
  try {
    const request = () => axios.post(url, payload, {withCredentials: true});
    const {data} = await handleRequest(request);
    return [null, data]
  } catch (error) {
    return [error, null]
  }
};
