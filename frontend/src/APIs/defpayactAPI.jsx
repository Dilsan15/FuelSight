import axios from "axios";

const defpayactAPI = axios.create({
  baseURL: "https://petrol-pump-accounting.onrender.com/api/defpayact",
});

export default defpayactAPI;
