import axios from "axios";

const defPayAPI = axios.create({
  baseURL: "http://localhost:5001/api/defpayact",
});

export default defPayAPI;
