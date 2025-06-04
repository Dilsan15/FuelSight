import axios from "axios";

const defpayactAPI = axios.create({
  baseURL: "http://localhost:5001/api/defpayact",
});

export default defpayactAPI;
