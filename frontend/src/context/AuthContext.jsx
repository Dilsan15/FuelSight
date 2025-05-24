import { createContext, useReducer, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

export const authReducer = (state, action) => {
  switch (action.type) {
    case "LOGIN":
      return { user: action.payload };
    case "LOGOUT":
      return { user: null };
    default:
      return state;
  }
};

export const AuthContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, { user: null });
  const [loading, setLoading] = useState(true);

  // Check token expiration
  const checkTokenExpiration = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.token) {
      try {
        const decodedToken = jwtDecode(user.token);
        const currentTime = Date.now() / 1000;

        if (decodedToken.exp < currentTime) {
          // Token has expired
          localStorage.removeItem("user");
          dispatch({ type: "LOGOUT" });
          window.location.href = "/login";
        }
      } catch (error) {
        // Invalid token
        localStorage.removeItem("user");
        dispatch({ type: "LOGOUT" });
      }
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (user) {
      dispatch({ type: "LOGIN", payload: user });
    }

    setLoading(false);

    // Check token expiration every minute
    const interval = setInterval(checkTokenExpiration, 60000);

    // Initial check
    checkTokenExpiration();

    return () => clearInterval(interval);
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, role: state.user?.role, dispatch, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
