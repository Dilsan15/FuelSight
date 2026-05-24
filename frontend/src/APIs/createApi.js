import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");

export function createApi(path) {
  return axios.create({
    baseURL: `${apiBaseUrl}${path}`,
  });
}
