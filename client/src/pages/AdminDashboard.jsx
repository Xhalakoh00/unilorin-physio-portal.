import { useState, useEffect } from 'react';
import API from '../api';
import Papa from 'papaparse';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dispatch'); // 'dispatch', 'results', 'candidates', 'manage'

  // Manage Election State (Positions, Deletions)
  const [positionData, setPositionData] = useState({ title: '', displayOrder: '' });
  const [manageStatus, setManageStatus] = useState({ loading: false, msg: '', isError: false });

  // Dispatch Voter Form State
  const [voterData, setVoterData] = useState({ matricNumber: '', email: '', fullName: '', level: '' });
  const [dispatchStatus, setDispatchStatus] = useState({ loading: false, msg: '', isError: false });
  const [csvFile, setCsvFile] = useState(null);
  const [bulkStatus, setBulkStatus] = useState({ loading: false, msg: '', isError: false, errors: [] });

  // Live Results State
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Candidate Management State
  const [candidateData, setCandidateData] = useState({ fullName: '', positionId: '', level: '', manifesto: '', imageUrl: '' });
  const [positions, setPositions] = useState([]);
  const [candStatus, setCandStatus] = useState({ loading: false, msg: '', isError: false });
  

  // Fetch results and positions when switching tabs
  useEffect(() => {
    if (activeTab === 'results') {
      fetchLiveResults();
    } else if (activeTab === 'candidates' || activeTab === 'manage') {
      fetchBallotPositions();
    }
  }, [activeTab]);

  const fetchLiveResults = async () => {
    setResultsLoading(true);
    try {
      const res = await API.get('/election/results');
      setResults(res.data.results);
      setResultsLoading(false);
    } catch (err) {
      setResultsLoading(false);
    }
  };

  const fetchBallotPositions = async () => {
    try {
      const res = await API.get('/election/ballot');
      setPositions(res.data.ballot);
    } catch (err) {
      console.error(err);
    }
  };

  // 1. Handle Dispatch Voter PIN
  const handleVoterSubmit = async (e) => {
    e.preventDefault();
    setDispatchStatus({ loading: true, msg: '', isError: false });

    try {
      const res = await API.post('/admin/generate-voter', voterData);
      setDispatchStatus({ loading: false, msg: res.data.message, isError: false });
      setVoterData({ matricNumber: '', email: '', fullName: '', level: '' });
    } catch (err) {
      setDispatchStatus({
        loading: false,
        msg: err.response?.data?.message || 'Failed to dispatch credential email.',
        isError: true,
      });
    }
  };

  // 1b. Handle Bulk CSV Upload
  const handleBulkSubmit = (e) => {
    e.preventDefault();
    if (!csvFile) return alert('Please select a CSV file first.');

    setBulkStatus({ loading: true, msg: 'Parsing CSV...', isError: false, errors: [] });

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const voters = results.data;
        
        try {
          setBulkStatus({ loading: true, msg: `Dispatching emails to ${voters.length} students. Please wait...`, isError: false, errors: [] });
          const res = await API.post('/admin/bulk-generate-voters', { voters });
          
          setBulkStatus({ loading: false, msg: res.data.message, isError: false, errors: res.data.errors });
          setCsvFile(null);
        } catch (err) {
          setBulkStatus({
            loading: false,
            msg: err.response?.data?.message || 'Failed to process bulk upload.',
            isError: true,
            errors: []
          });
        }
      }
    });
  };

  // 2. Handle Add Candidate (with Image Upload)
  const handleCandidateSubmit = async (e) => {
    e.preventDefault();
    setCandStatus({ loading: true, msg: 'Uploading image and saving candidate...', isError: false });

    // When sending files, we must package the data as FormData, not a standard JSON object
    const formData = new FormData();
    formData.append('fullName', candidateData.fullName);
    formData.append('positionId', candidateData.positionId);
    formData.append('level', candidateData.level);
    formData.append('manifesto', candidateData.manifesto);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      await API.post('/admin/candidates', formData);
      setCandStatus({ loading: false, msg: 'Candidate registered successfully!', isError: false });
      setCandidateData({ fullName: '', positionId: '', level: '', manifesto: '' });
      setImageFile(null); // Clear the file
      fetchBallotPositions(); // Refresh the list
    } catch (err) {
      setCandStatus({
        loading: false,
        msg: err.response?.data?.message || 'Failed to add candidate.',
        isError: true,
      });
    }
  };

  // 3. Handle Add Position
  const handlePositionSubmit = async (e) => {
    e.preventDefault();
    setManageStatus({ loading: true, msg: '', isError: false });
    try {
      await API.post('/admin/positions', positionData);
      setManageStatus({ loading: false, msg: 'New position added to ballot!', isError: false });
      setPositionData({ title: '', displayOrder: '' });
      fetchBallotPositions();
    } catch (err) {
      setManageStatus({ loading: false, msg: 'Failed to add position.', isError: true });
    }
  };

  // 4. Handle Delete Candidate
  const handleDeleteCandidate = async (candidateId, candidateName) => {
    if (!window.confirm(`Are you sure you want to remove ${candidateName} from the ballot?`)) return;
    try {
      await API.delete(`/admin/candidates/${candidateId}`);
      alert(`${candidateName} removed successfully.`);
      fetchBallotPositions();
    } catch (err) {
      alert('Failed to delete candidate.');
    }
  };

  // 5. Handle Reset Election
  const handleResetElection = async () => {
    const confirmReset = window.prompt('DANGER: This will wipe all votes and voting records. Type "RESET" to confirm:');
    if (confirmReset !== 'RESET') return;
    
    try {
      await API.delete('/admin/reset-votes');
      alert('Election data has been completely reset for the new year.');
      fetchLiveResults();
    } catch (err) {
      alert('Failed to reset election.');
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>Electoral Commission Control Panel</h2>
        <p>Manage voters, dispatch email credentials, and monitor election results.</p>
      </div>

      {/* Cleaned Up Tab Navigation */}
      <div className="admin-tabs">
        <button className={`tab-btn ${activeTab === 'dispatch' ? 'active' : ''}`} onClick={() => setActiveTab('dispatch')}>Dispatch Credentials</button>
        <button className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')}>Live Vote Tally</button>
        <button className={`tab-btn ${activeTab === 'candidates' ? 'active' : ''}`} onClick={() => { setActiveTab('candidates'); fetchBallotPositions(); }}>Add Candidate</button>
        <button className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`} onClick={() => { setActiveTab('manage'); fetchBallotPositions(); }}>Manage Election</button>
      </div>

      {/* Tab 1: Dispatch Voter Credentials */}
      {activeTab === 'dispatch' && (
        <div className="dispatch-grid" style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          
          <div className="admin-card">
            <h3>Single Student Registration</h3>
            <p className="card-subtitle">Generate and email a PIN for one student.</p>

            {dispatchStatus.msg && (
              <div className={dispatchStatus.isError ? 'error-alert' : 'success-alert'}>{dispatchStatus.msg}</div>
            )}

            <form onSubmit={handleVoterSubmit} className="admin-form">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={voterData.fullName} onChange={(e) => setVoterData({ ...voterData, fullName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Matric Number</label>
                <input type="text" value={voterData.matricNumber} onChange={(e) => setVoterData({ ...voterData, matricNumber: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Student Email Address</label>
                <input type="email" value={voterData.email} onChange={(e) => setVoterData({ ...voterData, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Academic Level</label>
                <input type="number" value={voterData.level} onChange={(e) => setVoterData({ ...voterData, level: e.target.value })} required />
              </div>
              <button type="submit" className="submit-btn" disabled={dispatchStatus.loading}>
                {dispatchStatus.loading ? 'Dispatching Email...' : 'Generate & Email PIN'}
              </button>
            </form>
          </div>

          <div className="admin-card">
            <h3>Bulk CSV Upload</h3>
            <p className="card-subtitle">Upload an Excel/CSV file to register and email hundreds of students instantly.</p>
            
            <div style={{ backgroundColor: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', border: '1px solid var(--navy-accent)' }}>
              <strong style={{ color: 'var(--teal)' }}>CSV Format Required:</strong> Your file must have exact headers: 
              <code style={{ display: 'block', marginTop: '0.5rem', color: 'var(--gold)' }}>fullName, matricNumber, email, level</code>
            </div>

            {bulkStatus.msg && (
              <div className={bulkStatus.isError ? 'error-alert' : 'success-alert'}>{bulkStatus.msg}</div>
            )}
            
            {bulkStatus.errors && bulkStatus.errors.length > 0 && (
              <div className="error-alert" style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.8rem' }}>
                <strong>Issues encountered:</strong>
                <ul style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
                  {bulkStatus.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                </ul>
              </div>
            )}

            <form onSubmit={handleBulkSubmit} className="admin-form">
              <div className="form-group">
                <label>Select CSV File</label>
                <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])} required style={{ border: 'none', padding: '0.5rem 0' }}/>
              </div>
              <button type="submit" className="submit-btn" disabled={bulkStatus.loading} style={{ backgroundColor: 'var(--teal)' }}>
                {bulkStatus.loading ? 'Processing Upload...' : 'Upload & Dispatch All'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Live Election Results */}
      {activeTab === 'results' && (
        <div className="admin-card">
          <div className="results-header">
            <h3>Real-Time Election Results</h3>
            <button onClick={fetchLiveResults} className="refresh-btn">Refresh Tally</button>
          </div>

          {resultsLoading ? (
            <p className="loading-state">Fetching live database counts...</p>
          ) : (
            <div className="results-list">
              {results.map((pos) => (
                <div key={pos._id} className="results-position-block">
                  <h4>{pos.title}</h4>
                  <div className="tally-grid">
                    {pos.candidates.map((cand) => (
                      <div key={cand._id} className="tally-card">
                        <div className="tally-info">
                          <span className="cand-name">{cand.fullName}</span>
                          <span className="vote-badge">{cand.voteCount} Votes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Add Candidate */}
      {activeTab === 'candidates' && (
        <div className="admin-card">
          <h3>Register New Executive Candidate</h3>

          {candStatus.msg && (
            <div className={candStatus.isError ? 'error-alert' : 'success-alert'}>{candStatus.msg}</div>
          )}

          <form onSubmit={handleCandidateSubmit} className="admin-form">
            <div className="form-group">
              <label>Candidate Full Name</label>
              <input type="text" placeholder="e.g., Candidate F" value={candidateData.fullName} onChange={(e) => setCandidateData({ ...candidateData, fullName: e.target.value })} required />
            </div>

            <div className="form-group">
              <label>Target Position</label>
              <select value={candidateData.positionId} onChange={(e) => setCandidateData({ ...candidateData, positionId: e.target.value })} required className="select-input">
                <option value="">Select an Executive Position</option>
                {positions.map((pos) => (
                  <option key={pos.positionId} value={pos.positionId}>
                    {pos.positionTitle}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Level</label>
              <input type="number" placeholder="e.g., 400" value={candidateData.level} onChange={(e) => setCandidateData({ ...candidateData, level: e.target.value })} required />
            </div>

            <div className="form-group">
              <label>Manifesto Summary</label>
              <textarea placeholder="Short statement or campaign promise..." value={candidateData.manifesto} onChange={(e) => setCandidateData({ ...candidateData, manifesto: e.target.value })} rows="3" className="textarea-input"></textarea>
            </div>

            <div className="form-group">
              <label>Candidate Headshot (Optional)</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setImageFile(e.target.files[0])} 
                style={{ border: 'none', padding: '0.5rem 0', color: 'var(--text-secondary)' }}
              />
            </div>

            <button type="submit" className="submit-btn" disabled={candStatus.loading}>
              {candStatus.loading ? 'Saving...' : 'Add Candidate to Ballot'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Manage Election */}
      {activeTab === 'manage' && (
        <div className="dispatch-grid" style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          
          <div className="admin-card">
            <h3>Create New Position</h3>
            <p className="card-subtitle">Add a new executive role to the ballot.</p>
            
            {manageStatus.msg && (
              <div className={manageStatus.isError ? 'error-alert' : 'success-alert'}>{manageStatus.msg}</div>
            )}

            <form onSubmit={handlePositionSubmit} className="admin-form">
              <div className="form-group">
                <label>Position Title</label>
                <input type="text" placeholder="e.g., Financial Secretary" value={positionData.title} onChange={(e) => setPositionData({ ...positionData, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Display Order (Number)</label>
                <input type="number" placeholder="e.g., 5" value={positionData.displayOrder} onChange={(e) => setPositionData({ ...positionData, displayOrder: e.target.value })} required />
              </div>
              <button type="submit" className="submit-btn">Add Position</button>
            </form>
          </div>

          <div className="admin-card">
            <h3>Manage Roster & System</h3>
            <p className="card-subtitle">Remove disqualified candidates or reset the entire system for a new election year.</p>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '2rem', paddingRight: '10px' }}>
              {positions.map(pos => (
                <div key={pos.positionId} style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ color: 'var(--teal)', marginBottom: '0.5rem' }}>{pos.positionTitle}</h4>
                  {pos.candidates.map(cand => (
                    <div key={cand._id} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-dark)', padding: '0.5rem 1rem', marginBottom: '0.5rem', borderRadius: '6px', alignItems: 'center' }}>
                      <span>{cand.fullName}</span>
                      <button onClick={() => handleDeleteCandidate(cand._id, cand.fullName)} style={{ backgroundColor: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer' }}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
              <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Danger Zone</h4>
              <button onClick={handleResetElection} style={{ width: '100%', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '2px solid var(--danger)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                WIPE ALL VOTES (START NEW ELECTION)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;