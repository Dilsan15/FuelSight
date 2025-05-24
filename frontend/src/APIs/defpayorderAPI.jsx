import axios from "axios";

const defPayOrderAPI = axios.create({
  baseURL: "http://localhost:5001/api/defpayorders",
  headers: {
    "Content-Type": "application/json",
  },
});


export default defPayOrderAPI;
