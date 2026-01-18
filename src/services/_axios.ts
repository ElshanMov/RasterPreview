import axios from 'axios'
import { store } from '../store/store'
import { showSnackbar } from '../store/slices/snackbarSlice'

let refreshTokenPromise: Promise<any> | null = null

const getRefreshToken = (refreshToken: string) => {
  return axios.post(
    `${import.meta.env.VITE_API_URL}/auth/api/v1/accounts/refresh-sign-in`,
    { 'refreshToken': refreshToken }
  )
}

const axiosInstance = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}`,
  timeout: 0,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
})

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const { status, config, data } = error.response
    if (status === 401) {
      const refreshToken: string = localStorage.getItem('refreshToken') || ''

      if (!refreshToken) {
        localStorage.clear()
        window.location.href = `/`
      }

      if (!refreshTokenPromise) {
        refreshTokenPromise = getRefreshToken(refreshToken).then(({ data }) => {
          const { accessToken, refreshToken } = data
          refreshTokenPromise = null
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', refreshToken)
          return accessToken
        })
      }
      return refreshTokenPromise
        .then((token: string) => {
          config.headers['Authorization'] = `Bearer ${token}`
          return axiosInstance.request(config)
        })
        .catch(() => {
          localStorage.clear()
          window.location.href = `/`
        })
    } else {
      store.dispatch(
        showSnackbar({
          message: 'Xəta baş verdi!',
          type: 'error',
        })
      )
    }
    return Promise.reject({ status, data })
  }
)

axiosInstance.interceptors.request.use((request) => {
  const accessToken: string | null = localStorage.getItem('accessToken')
  if (accessToken) {
    request.headers['Authorization'] = `Bearer ${accessToken}`
  }
  return request
})

export default axiosInstance