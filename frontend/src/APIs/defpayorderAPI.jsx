import axios from "axios";

const defPayOrderAPI = axios.create({
  baseURL: "https://petrol-pump-accounting.onrender.com/api/defpayorders",
  headers: {
    "Content-Type": "application/json",
  },
});


export default defPayOrderAPI;
