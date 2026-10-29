import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Ballot from './pages/Ballot';
import AdminDashboard from './pages/AdminDashboard'; // <-- Import Admin Dashboard

function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/ballot" element={<Ballot />} />
          <Route path="/admin" element={<AdminDashboard />} /> {/* <-- Add Route */}
        </Routes>
      </main>
    </>
  );
}

export default App;