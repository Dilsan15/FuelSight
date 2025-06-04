import axios from "axios";

const dayrateAPI = axios.create({
  baseURL: "http://localhost:5001/api/dayrates",
  headers: {
    "Content-Type": "application/json",
  },
});

export default dayrateAPI;
