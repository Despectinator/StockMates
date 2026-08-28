import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stockmates_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// A 401 here means the token is missing/expired/invalid — clear the
// stored session so the app falls back to the login screen instead of
// silently repeating failed requests. Login/register calls also 401 on
// bad credentials, so we only react to it for requests that carried a
// token in the first place.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadToken = Boolean(error.config?.headers?.Authorization)
    if (error.response?.status === 401 && hadToken) {
      localStorage.removeItem('stockmates_token')
      localStorage.removeItem('stockmates_user')
      localStorage.removeItem('stockmates_household_id')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
