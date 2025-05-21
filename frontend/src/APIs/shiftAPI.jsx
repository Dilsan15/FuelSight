import axios from "axios";

export default axios.create({
  baseURL: "https://petrol-pump-accounting.onrender.com/api/shifts"
});
