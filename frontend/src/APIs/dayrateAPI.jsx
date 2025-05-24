import axios from "axios";

const dayrateAPI = axios.create({
  baseURL: "https://petrol-pump-accounting.onrender.com/api/dayrates",
});

export default dayrateAPI;
