import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

const Login = () => {
  const [formData, setFormData] = useState({ matricNumber: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await API.post('/auth/login', formData);
      // Store the secure token in local storage
      localStorage.setItem('token', res.data.token);
      // Redirect to the voting ballot
      navigate('/ballot');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Voter Authentication</h2>
        <p>Enter your Matriculation Number to access the electoral portal.</p>
        
        {error && <div className="error-alert">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Matric Number</label>
            <input
              type="text"
              name="matricNumber"
              placeholder="e.g., 22/47PT019"
              value={formData.matricNumber}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <button type="submit" className="submit-btn">
            Login to Vote
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;