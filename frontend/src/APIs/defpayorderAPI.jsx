import axios from "axios";

const defPayOrderAPI = axios.create({
  baseURL: "http://localhost:5001/api/defpayorders",

});


export default defPayOrderAPI;
