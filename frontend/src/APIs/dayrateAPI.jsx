import axios from "axios";

const dayrateAPI = axios.create({
  baseURL: "https://petrol-pump-accounting-frntend.onrender.com/api/dayrates",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default dayrateAPI;
