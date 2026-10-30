import { useState, useEffect } from 'react';
import API from '../api';
import Papa from 'papaparse';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dispatch'); // 'dispatch', 'results', 'candidates', 'manage'

  // Election Session State
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionData, setSessionData] = useState({ academicYear: '', startTime: '', endTime: '' });
  const [sessionStatus, setSessionStatus] = useState({ loading: false, msg: '', isError: false });
  const [turnout, setTurnout] = useState({ total: 0, voted: 0 });

  // Manage Positions State
  const [positionData, setPositionData] = useState({ title: '', displayOrder: '' });
  const [manageStatus, setManageStatus] = useState({ loading: false, msg: '', isError: false });

  // Dispatch Voter Form State
  const [voterData, setVoterData] = useState({ matricNumber: '', email: '', fullName: '', level: '' });
  const [dispatchStatus, setDispatchStatus] = useState({ loading: false, msg: '', isError: false });
  const [csvFile, setCsvFile] = useState(null);
  const [bulkStatus, setBulkStatus] = useState({ loading: false, msg: '', isError: false, errors: [] });

  // Results & Archive State
  const [results, setResults] = useState([]);
  const [archives, setArchives] = useState([]);
  const [selectedArchive, setSelectedArchive] = useState(''); // Holds the year of selected past election
  const [resultsLoading, setResultsLoading] = useState(false);

  // Candidate State
  const [candidateData, setCandidateData] = useState({ fullName: '', positionId: '', level: '', manifesto: '' });
  const [positions, setPositions] = useState([]);
  const [candStatus, setCandStatus] = useState({ loading: false, msg: '', isError: false });
  const [imageFile, setImageFile] = useState(null);

  // Fetch logic on tab switch
  useEffect(() => {
    if (activeTab === 'results') {
      fetchLiveResults();
      fetchArchives();
    } else if (activeTab === 'candidates' || activeTab === 'manage') {
      fetchBallotPositions();
    }
    if (activeTab === 'manage') {
      fetchCurrentSession();
    }
  }, [activeTab]);

  const fetchLiveResults = async () => {
    setResultsLoading(true);
    try {
      const res = await API.get('/election/results');
      setResults(res.data.results);
      if (res.data.turnout) setTurnout(res.data.turnout); // Capture the turnout
      setResultsLoading(false);
    } catch (err) {
      setResultsLoading(false);
    }
  };

  const fetchArchives = async () => {
    try {
      const res = await API.get('/admin/archives');
      setArchives(res.data.archives);
    } catch (err) {
      console.error(err);
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

  const fetchCurrentSession = async () => {
    try {
      const res = await API.get('/admin/session');
      if (res.data.session) {
        setCurrentSession(res.data.session);
        // Format dates for the HTML datetime-local inputs
        setSessionData({
          academicYear: res.data.session.academicYear,
          startTime: new Date(res.data.session.startTime).toISOString().slice(0, 16),
          endTime: new Date(res.data.session.endTime).toISOString().slice(0, 16),
        });
      }
    } catch (err) {
      console.error("No active session found.");
    }
  };

  // --- Handlers for Forms ---

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    setSessionStatus({ loading: true, msg: '', isError: false });
    try {
      await API.post('/admin/session', sessionData);
      setSessionStatus({ loading: false, msg: 'Election session times updated!', isError: false });
      fetchCurrentSession();
    } catch (err) {
      setSessionStatus({ loading: false, msg: err.response?.data?.message || 'Failed to update session.', isError: true });
    }
  };

  const handleVoterSubmit = async (e) => {
    e.preventDefault();
    setDispatchStatus({ loading: true, msg: '', isError: false });
    try {
      const res = await API.post('/admin/generate-voter', voterData);
      setDispatchStatus({ loading: false, msg: res.data.message, isError: false });
      setVoterData({ matricNumber: '', email: '', fullName: '', level: '' });
    } catch (err) {
      setDispatchStatus({ loading: false, msg: err.response?.data?.message || 'Failed to dispatch email.', isError: true });
    }
  };

  const handleBulkSubmit = (e) => {
    e.preventDefault();
    if (!csvFile) return alert('Please select a CSV file.');
    setBulkStatus({ loading: true, msg: 'Parsing CSV...', isError: false, errors: [] });

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const voters = results.data;
        try {
          setBulkStatus({ loading: true, msg: `Dispatching emails to ${voters.length} students...`, isError: false, errors: [] });
          const res = await API.post('/admin/bulk-generate-voters', { voters });
          setBulkStatus({ loading: false, msg: res.data.message, isError: false, errors: res.data.errors });
          setCsvFile(null);
        } catch (err) {
          setBulkStatus({ loading: false, msg: err.response?.data?.message || 'Upload failed.', isError: true, errors: [] });
        }
      }
    });
  };

  const handleCandidateSubmit = async (e) => {
    e.preventDefault();
    setCandStatus({ loading: true, msg: 'Saving candidate...', isError: false });
    const formData = new FormData();
    formData.append('fullName', candidateData.fullName);
    formData.append('positionId', candidateData.positionId);
    formData.append('level', candidateData.level);
    formData.append('manifesto', candidateData.manifesto);
    if (imageFile) formData.append('image', imageFile);

    try {
      await API.post('/admin/candidates', formData);
      setCandStatus({ loading: false, msg: 'Candidate registered!', isError: false });
      setCandidateData({ fullName: '', positionId: '', level: '', manifesto: '' });
      setImageFile(null); 
      fetchBallotPositions(); 
    } catch (err) {
      setCandStatus({ loading: false, msg: err.response?.data?.message || 'Failed to add candidate.', isError: true });
    }
  };
  
  const handlePositionSubmit = async (e) => {
    e.preventDefault();
    setManageStatus({ loading: true, msg: '', isError: false });
    try {
      await API.post('/admin/positions', positionData);
      setManageStatus({ loading: false, msg: 'New position added!', isError: false });
      setPositionData({ title: '', displayOrder: '' });
      fetchBallotPositions();
    } catch (err) {
      setManageStatus({ loading: false, msg: 'Failed to add position.', isError: true });
    }
  };

  const handleDeletePosition = async (positionId, positionTitle) => {
    if (!window.confirm(`DANGER: Delete the ENTIRE "${positionTitle}" position and its candidates?`)) return;
    try {
      await API.delete(`/admin/positions/${positionId}`);
      alert(`${positionTitle} completely removed.`);
      fetchBallotPositions();
    } catch (err) {
      alert('Failed to delete position.');
    }
  };

  const handleDeleteCandidate = async (candidateId, candidateName) => {
    if (!window.confirm(`Remove ${candidateName} from the ballot?`)) return;
    try {
      await API.delete(`/admin/candidates/${candidateId}`);
      alert(`${candidateName} removed.`);
      fetchBallotPositions();
    } catch (err) {
      alert('Failed to delete candidate.');
    }
  };

  const handleArchiveElection = async () => {
    const confirmReset = window.prompt('DANGER: This will permanently archive the results and WIPE all live voters and candidates to prepare for the next year. Type "ARCHIVE" to confirm:');
    if (confirmReset !== 'ARCHIVE') return;
    
    try {
      const res = await API.post('/admin/archive');
      alert(res.data.message);
      fetchLiveResults();
      fetchArchives();
      fetchBallotPositions();
      setCurrentSession(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive election.');
    }
  };

  // Determine what data to show on the Results page (Live vs Archive)
  const activeArchive = archives.find(a => a.academicYear === selectedArchive);
  const displayResults = activeArchive ? activeArchive.electionData : results;
  const isViewingArchive = !!activeArchive;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>Electoral Commission Control Panel</h2>
        <p>Manage voters, set schedules, and monitor election results.</p>
      </div>

      <div className="admin-tabs">
        <button className={`tab-btn ${activeTab === 'dispatch' ? 'active' : ''}`} onClick={() => setActiveTab('dispatch')}>Dispatch Credentials</button>
        <button className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')}>Live Vote Tally</button>
        <button className={`tab-btn ${activeTab === 'candidates' ? 'active' : ''}`} onClick={() => setActiveTab('candidates')}>Add Candidate</button>
        <button className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`} onClick={() => setActiveTab('manage')}>Manage Election</button>
      </div>

      {/* TAB 1: DISPATCH */}
      {activeTab === 'dispatch' && (
        <div className="dispatch-grid" style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {/* ... (Existing Dispatch UI remains unchanged) ... */}
          <div className="admin-card">
            <h3>Single Student Registration</h3>
            {dispatchStatus.msg && <div className={dispatchStatus.isError ? 'error-alert' : 'success-alert'}>{dispatchStatus.msg}</div>}
            <form onSubmit={handleVoterSubmit} className="admin-form">
              <div className="form-group"><label>Full Name</label><input type="text" value={voterData.fullName} onChange={(e) => setVoterData({ ...voterData, fullName: e.target.value })} required /></div>
              <div className="form-group"><label>Matric Number</label><input type="text" value={voterData.matricNumber} onChange={(e) => setVoterData({ ...voterData, matricNumber: e.target.value })} required /></div>
              <div className="form-group"><label>Student Email Address</label><input type="email" value={voterData.email} onChange={(e) => setVoterData({ ...voterData, email: e.target.value })} required /></div>
              <div className="form-group"><label>Academic Level</label><input type="number" value={voterData.level} onChange={(e) => setVoterData({ ...voterData, level: e.target.value })} required /></div>
              <button type="submit" className="submit-btn" disabled={dispatchStatus.loading}>{dispatchStatus.loading ? 'Dispatching...' : 'Generate & Email PIN'}</button>
            </form>
          </div>

          <div className="admin-card">
            <h3>Bulk CSV Upload</h3>
            <div style={{ backgroundColor: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', border: '1px solid var(--navy-accent)' }}>
              <strong style={{ color: 'var(--teal)' }}>CSV Format Required:</strong> 
              <code style={{ display: 'block', marginTop: '0.5rem', color: 'var(--gold)' }}>fullName, matricNumber, email, level</code>
            </div>
            {bulkStatus.msg && <div className={bulkStatus.isError ? 'error-alert' : 'success-alert'}>{bulkStatus.msg}</div>}
            {bulkStatus.errors && bulkStatus.errors.length > 0 && (
              <div className="error-alert" style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.8rem' }}>
                <ul style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>{bulkStatus.errors.map((err, idx) => <li key={idx}>{err}</li>)}</ul>
              </div>
            )}
            <form onSubmit={handleBulkSubmit} className="admin-form">
              <div className="form-group">
                <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])} required style={{ border: 'none', padding: '0.5rem 0' }}/>
              </div>
              <button type="submit" className="submit-btn" disabled={bulkStatus.loading} style={{ backgroundColor: 'var(--teal)' }}>{bulkStatus.loading ? 'Processing...' : 'Upload & Dispatch All'}</button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: RESULTS & ARCHIVES */}
      {activeTab === 'results' && (
        <div className="admin-card">
          <div className="results-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <h3>{isViewingArchive ? `${selectedArchive} Final Results` : 'Real-Time Election Results'}</h3>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              {/* The Archive Selector Dropdown */}
              <select 
                value={selectedArchive} 
                onChange={(e) => setSelectedArchive(e.target.value)} 
                className="select-input" 
                style={{ minWidth: '200px', margin: 0 }}
              >
                <option value="">🟢 View Live Current Election</option>
                {archives.map(arc => (
                  <option key={arc._id} value={arc.academicYear}>🏛️ {arc.academicYear} Archive</option>
                ))}
              </select>

              {!isViewingArchive && (
                <button onClick={fetchLiveResults} className="refresh-btn">Refresh Tally</button>
              )}
            </div>
          </div>

         {/* LIVE VOTER TURNOUT BAR */}
          {!isViewingArchive && (
            <div style={{ backgroundColor: 'var(--bg-dark)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--navy-accent)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--teal)' }}>Live Voter Turnout</strong>
                <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>
                  {turnout.total > 0 ? Math.round((turnout.voted / turnout.total) * 100) : 0}% 
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginLeft: '8px' }}>
                    ({turnout.voted} / {turnout.total} Students)
                  </span>
                </span>
              </div>
              
              <div style={{ width: '100%', height: '12px', backgroundColor: '#1e293b', borderRadius: '6px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${turnout.total > 0 ? (turnout.voted / turnout.total) * 100 : 0}%`, 
                    backgroundColor: 'var(--gold)',
                    transition: 'width 1s ease-in-out' 
                  }}
                ></div>
              </div>
            </div>
          )}
         
          {resultsLoading ? (
            <p className="loading-state">Fetching database counts...</p>
          ) : (
            <div className="results-list">
              {displayResults.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No election data found.</p>
              ) : (
                displayResults.map((pos, idx) => (
                  <div key={pos._id || idx} className="results-position-block">
                    <h4>{pos.title || pos.positionTitle}</h4>
                    <div className="tally-grid">
                      {pos.candidates.map((cand, cIdx) => (
                        <div key={cand._id || cIdx} className="tally-card" style={{ display: 'flex', alignItems: 'center', gap: '15px', position: 'relative' }}>
                          
                          {cand.imageUrl ? (
                            <img src={cand.imageUrl} alt={cand.fullName} style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--teal)' }} />
                          ) : (
                            <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'var(--navy-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontWeight: 'bold' }}>
                              {cand.fullName.charAt(0)}
                            </div>
                          )}

                          <div className="tally-info" style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className="cand-name">{cand.fullName}</span>
                              {cand.isWinner && <span style={{ color: 'var(--gold)', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '0.2rem' }}>🏆 WINNER</span>}
                            </div>
                            <span className="vote-badge">{cand.voteCount} Votes</span>
                          </div>
                          
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CANDIDATES */}
      {activeTab === 'candidates' && (
        <div className="admin-card">
          {/* ... (Existing Add Candidate UI remains unchanged) ... */}
          <h3>Register New Executive Candidate</h3>
          {candStatus.msg && <div className={candStatus.isError ? 'error-alert' : 'success-alert'}>{candStatus.msg}</div>}
          <form onSubmit={handleCandidateSubmit} className="admin-form">
            <div className="form-group"><label>Candidate Full Name</label><input type="text" value={candidateData.fullName} onChange={(e) => setCandidateData({ ...candidateData, fullName: e.target.value })} required /></div>
            <div className="form-group">
              <label>Target Position</label>
              <select value={candidateData.positionId} onChange={(e) => setCandidateData({ ...candidateData, positionId: e.target.value })} required className="select-input">
                <option value="">Select an Executive Position</option>
                {positions.map((pos) => <option key={pos.positionId} value={pos.positionId}>{pos.positionTitle}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Level</label><input type="number" value={candidateData.level} onChange={(e) => setCandidateData({ ...candidateData, level: e.target.value })} required /></div>
            <div className="form-group"><label>Manifesto</label><textarea value={candidateData.manifesto} onChange={(e) => setCandidateData({ ...candidateData, manifesto: e.target.value })} rows="3" className="textarea-input"></textarea></div>
            <div className="form-group"><label>Headshot (Optional)</label><input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={{ padding: '0.5rem 0' }} /></div>
            <button type="submit" className="submit-btn" disabled={candStatus.loading}>{candStatus.loading ? 'Saving...' : 'Add Candidate'}</button>
          </form>
        </div>
      )}

      {/* TAB 4: MANAGE ELECTION & TIME */}
      {activeTab === 'manage' && (
        <div className="dispatch-grid" style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          
          {/* NEW: Session Time Control */}
          <div className="admin-card">
            <h3>Election Session Schedule</h3>
            <p className="card-subtitle">Set the exact time the ballot automatically opens and closes for voters.</p>
            
            {sessionStatus.msg && <div className={sessionStatus.isError ? 'error-alert' : 'success-alert'}>{sessionStatus.msg}</div>}

            <form onSubmit={handleSessionSubmit} className="admin-form">
              <div className="form-group">
                <label>Academic Year Session</label>
                <input type="text" placeholder="e.g., 2025/2026" value={sessionData.academicYear} onChange={(e) => setSessionData({ ...sessionData, academicYear: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Start Time (Voting Opens)</label>
                <input type="datetime-local" value={sessionData.startTime} onChange={(e) => setSessionData({ ...sessionData, startTime: e.target.value })} required className="select-input" />
              </div>
              <div className="form-group">
                <label>End Time (Voting Closes)</label>
                <input type="datetime-local" value={sessionData.endTime} onChange={(e) => setSessionData({ ...sessionData, endTime: e.target.value })} required className="select-input" />
              </div>
              <button type="submit" className="submit-btn" disabled={sessionStatus.loading} style={{ backgroundColor: 'var(--gold)', color: '#000' }}>
                {sessionStatus.loading ? 'Saving Time...' : 'Set Election Schedule'}
              </button>
            </form>
          </div>

          <div className="admin-card">
            <h3>Manage Roles & System Reset</h3>
            <p className="card-subtitle">Add/Delete positions, or archive the current election.</p>
            
            <form onSubmit={handlePositionSubmit} className="admin-form" style={{ marginBottom: '2rem' }}>
              <div className="form-group">
                <input type="text" placeholder="New Position Title (e.g. Welfare)" value={positionData.title} onChange={(e) => setPositionData({ ...positionData, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <input type="number" placeholder="Display Order (e.g. 5)" value={positionData.displayOrder} onChange={(e) => setPositionData({ ...positionData, displayOrder: e.target.value })} required />
              </div>
              <button type="submit" className="submit-btn">Add New Position</button>
            </form>
            
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '2rem', paddingRight: '10px' }}>
              {positions.map(pos => (
                <div key={pos.positionId} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>
                    <h4 style={{ color: 'var(--teal)', margin: 0 }}>{pos.positionTitle}</h4>
                    <button onClick={() => handleDeletePosition(pos.positionId, pos.positionTitle)} style={{ backgroundColor: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>
                      Delete Position
                    </button>
                  </div>
                  {pos.candidates.map(cand => (
                    <div key={cand._id} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-dark)', padding: '0.5rem 1rem', marginBottom: '0.5rem', borderRadius: '6px', alignItems: 'center' }}>
                      <span>{cand.fullName}</span>
                      <button onClick={() => handleDeleteCandidate(cand._id, cand.fullName)} style={{ backgroundColor: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer' }}>Remove</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
              <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>The Archive Protocol (Danger Zone)</h4>
              <button onClick={handleArchiveElection} style={{ width: '100%', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '2px solid var(--danger)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                ARCHIVE RESULTS & WIPE FOR NEXT YEAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;