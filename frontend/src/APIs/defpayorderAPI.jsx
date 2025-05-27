import axios from "axios";

const defPayOrderAPI = axios.create({
  baseURL: "https://petrol-pump-accounting.onrender.com/api/defpayorders",

});


export default defPayOrderAPI;
