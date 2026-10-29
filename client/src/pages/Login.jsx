import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

const Login = () => {
  const [formData, setFormData] = useState({ matricNumber: '', votingPin: '' }); // <-- Changed to votingPin
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
      localStorage.setItem('token', res.data.token);
      
      // Check role and redirect accordingly
      if (res.data.voter.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/ballot');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Voter Authentication</h2>
        <p>Enter your Matriculation Number and Voting PIN to access the ballot.</p>
        
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
            <label>6-Digit Voting PIN</label> {/* <-- Changed label */}
            <input
              type="text" /* <-- Changed type to text so they can see the generated characters */
              name="votingPin" /* <-- Changed name */
              placeholder="e.g., A7X9Q2"
              value={formData.votingPin}
              onChange={handleChange}
              required
              style={{ textTransform: 'uppercase' }}
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