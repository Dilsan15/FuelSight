import axios from "axios";

const dayrateAPI = axios.create({
  baseURL: "http://localhost:5001/api/dayrates",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default dayrateAPI;
