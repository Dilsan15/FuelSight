import { Link, useLocation, useNavigate } from 'react-router-dom'; // ✅ include useNavigate
import { Button } from '@/components/ui/button';
import { useLogout } from '@/Hooks/AuthHooks/useLogout';

const AdminNavbar = () => {
  const { logout } = useLogout();
  const location = useLocation();
  const navigate = useNavigate(); // ✅ initialize navigation

  const navItems = [
    { label: 'Shifts', path: '/admin-shifts' },
    { label: 'Orders', path: '/admin-orders' },
    { label: 'Accounts', path: '/admin-accounts' },
    { label: 'Day Rate', path: '/admin-day-rate' },
    { label: 'Users', path: '/admin-users' },
  ];

  const handleLogout = () => {
    logout();          
    navigate('/login'); 
  };

  return (
    <header className="bg-white shadow border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex-1 flex justify-center gap-[60px]">
        {navItems.map(({ label, path }) => (
          <Link
            key={path}
            to={path}
            className={`text-base font-semibold text-gray-700 hover:text-black transition ${
              location.pathname === path ? 'underline underline-offset-4 text-black' : ''
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      <Button onClick={handleLogout} className="text-sm font-semibold">
        Logout
      </Button>
    </header>
  );
};

export default AdminNavbar;
