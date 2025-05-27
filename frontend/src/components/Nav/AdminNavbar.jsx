import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/Hooks/AuthHooks/useLogout";
import { useState, useEffect } from "react";
import { Menu, X, Fuel, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const AdminNavbar = () => {
  const { logout } = useLogout();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const navItems = [
    { label: "Shifts", path: "/admin-shifts" },
    { label: "Orders", path: "/admin-orders" },
    { label: "Accounts", path: "/admin-accounts" },
    { label: "Day Rate", path: "/admin-day-rate" },
    { label: "Users", path: "/admin-users" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-200/80"
          : "bg-white"
      )}
    >
      <div className="max-w-7xl mx-auto">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <Link to="/admin-shifts" className="flex items-center group">
              <div className="relative">
                <Fuel className="h-8 w-8 text-black transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute -inset-2 rounded-full bg-gray-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <span className="ml-3 text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent hidden sm:block">
                Sanco Fuels
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map(({ label, path }) => (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                    location.pathname === path
                      ? "text-black bg-gray-100/80"
                      : "text-gray-600 hover:text-black hover:bg-gray-50"
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Desktop Logout */}
            <div className="hidden md:block">
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="font-medium text-gray-600 hover:text-black hover:bg-gray-100/80 transition-colors duration-200"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-gray-600" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            "md:hidden border-t border-gray-200 overflow-hidden transition-all duration-300",
            isMenuOpen ? "max-h-96" : "max-h-0"
          )}
        >
          <div className="px-4 py-3 space-y-1 bg-gray-50">
            {navItems.map(({ label, path }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "block px-3 py-2.5 rounded-md text-base font-medium transition-all duration-200",
                  location.pathname === path
                    ? "text-black bg-white shadow-sm"
                    : "text-gray-600 hover:text-black hover:bg-white"
                )}
              >
                {label}
              </Link>
            ))}
            <div className="pt-2 pb-1">
              <Button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}
                variant="ghost"
                className="w-full justify-center font-medium text-gray-600 hover:text-black hover:bg-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
