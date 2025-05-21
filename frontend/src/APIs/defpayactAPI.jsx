import axios from 'axios';

const defPayAPI = axios.create({
  baseURL: 'https://petrol-pump-accounting.onrender.com/api/defpayact'
});

export default defPayAPI;
