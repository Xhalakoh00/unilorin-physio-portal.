import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react'; // We will use this icon until you drop the official Unilorin logo in

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Shield color="#ffd700" size={32} />
        <div className="brand-text">
         <h1>NAPS E-VOTING</h1>
          <p>Department of Physiotherapy, Unilorin</p>
        </div>
      </div>
      
      <div className="nav-actions">
        {token ? (
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        ) : (
          <Link to="/login" className="login-btn">
            Voter Login
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;