import { useState, useEffect } from 'react';
import API from '../api';

const Ballot = () => {
  const [ballot, setBallot] = useState([]);
  const [votedPositions, setVotedPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedVotes, setSelectedVotes] = useState({});
  const [voterInfo, setVoterInfo] = useState(null);
  const [activeManifesto, setActiveManifesto] = useState(null); // Controls the pop-up

  // New Time & Security States
  const [electionSession, setElectionSession] = useState(null);
  const [timeStatus, setTimeStatus] = useState('loading'); // 'waiting', 'active', 'closed', 'none'
  const [countdown, setCountdown] = useState('');

  const handleSelectCandidate = (positionId, candidateId) => {
    setSelectedVotes((prevVotes) => ({
      ...prevVotes,
      [positionId]: candidateId,
    }));
  };

  useEffect(() => {
    const fetchElectionData = async () => {
      try {
        const ballotRes = await API.get('/election/ballot');
        setBallot(ballotRes.data.ballot);

        const voterRes = await API.get('/auth/me');
        setVotedPositions(voterRes.data.voter.votedPositions);
        setVoterInfo(voterRes.data.voter);

        // Fetch the master clock set by the Admin
        const sessionRes = await API.get('/election/session');
        setElectionSession(sessionRes.data.session);

        setLoading(false);
      } catch (err) {
        setError('Failed to load secure ballot data. Please log in again.');
        setLoading(false);
      }
    };
    fetchElectionData();
  }, []);

  // The Master Countdown Timer
  useEffect(() => {
    if (!electionSession) {
      setTimeStatus('none');
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(electionSession.startTime).getTime();
      const end = new Date(electionSession.endTime).getTime();

      if (now < start) {
        // Election hasn't started yet
        setTimeStatus('waiting');
        const distance = start - now;
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        setCountdown(`${days > 0 ? days + 'd ' : ''}${hours}h ${minutes}m ${seconds}s`);
      } else if (now >= start && now <= end) {
        // Election is currently active
        setTimeStatus('active');
        const distance = end - now;
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        setCountdown(`${hours}h ${minutes}m ${seconds}s remaining`);
      } else {
        // Election time has passed
        setTimeStatus('closed');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [electionSession]);

  const castVote = async (positionId) => {
    const candidateId = selectedVotes[positionId];
    if (!candidateId) return alert('Please select a candidate first.');

    setError('');
    setSuccess('');

    try {
      const res = await API.post('/election/vote', { positionId, candidateId });
      setSuccess(res.data.message);
      setVotedPositions(res.data.votedPositions);
    } catch (err) {
      setError(err.response?.data?.message || 'Error casting vote.');
    }
  };

  if (loading) {
    return <div className="loading-state">Loading Secure NAPS Ballot...</div>;
  }

  // --- SECURITY LOCKOUT SCREENS ---

  if (timeStatus === 'none') {
    return (
      <div className="ballot-container" style={{ textAlign: 'center', marginTop: '5rem' }}>
        <h2>No Active Election</h2>
        <p>The Electoral Commission has not scheduled an election yet. Please check back later.</p>
      </div>
    );
  }

  if (timeStatus === 'waiting') {
    return (
      <div className="ballot-container" style={{ textAlign: 'center', marginTop: '5rem' }}>
        <h2 style={{ color: 'var(--teal)', fontSize: '2.5rem' }}>Voting Opens In:</h2>
        <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--gold)', margin: '2rem auto', maxWidth: '600px', fontFamily: 'monospace', backgroundColor: 'var(--bg-dark)', padding: '2rem', borderRadius: '12px', border: '2px solid var(--navy-accent)' }}>
          {countdown}
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>The secure portal will automatically unlock when the countdown reaches zero.</p>
      </div>
    );
  }

  if (timeStatus === 'closed') {
    return (
      <div className="ballot-container" style={{ textAlign: 'center', marginTop: '5rem' }}>
        <h2 style={{ color: 'var(--danger)', fontSize: '2.5rem' }}>Election Concluded</h2>
        <p style={{ fontSize: '1.2rem', marginTop: '1rem' }}>The voting period for the {electionSession.academicYear} session has officially ended.</p>
        <p style={{ color: 'var(--text-secondary)', marginTop: '2rem' }}>Please await the official announcement of results by the Electoral Chairman.</p>
      </div>
    );
  }

  // --- ACTIVE BALLOT SCREEN ---
  return (
    <div className="ballot-container">
      <div className="ballot-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Official Election Ballot</h2>
          <p>Select your preferred candidate for each executive position.</p>
        </div>
        <div style={{ backgroundColor: 'var(--bg-dark)', padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--gold)', textAlign: 'right', minWidth: '220px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Portal Closes In:</span>
          <strong style={{ color: 'var(--gold)', fontSize: '1.3rem', fontFamily: 'monospace' }}>{countdown}</strong>
        </div>
      </div>

      {/* THE DIGITAL VOTER RECEIPT */}
      {ballot.length > 0 && votedPositions.length === ballot.length && (
        <div className="digital-receipt-card" style={{ 
          background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.1) 0%, rgba(2, 12, 27, 0.9) 100%)',
          border: '2px solid var(--teal)', 
          borderRadius: '12px', 
          padding: '2rem', 
          textAlign: 'center', 
          marginBottom: '2.5rem',
          boxShadow: '0 10px 30px rgba(13, 148, 136, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Watermark inside the receipt */}
          <div style={{ position: 'absolute', top: '-20%', right: '-10%', opacity: '0.05', transform: 'scale(1.5)', pointerEvents: 'none' }}>
             <img src="/naps-logo.png" alt="NAPS" width="300" />
          </div>

          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
          <h2 style={{ color: 'var(--teal)', fontSize: '2rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Ballot Secured
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
            Thank you, {voterInfo?.fullName}. Your encrypted votes have been successfully transmitted to the Electoral Commission.
          </p>
          
          <div style={{ 
            backgroundColor: 'var(--bg-dark)', 
            border: '1px dashed var(--gold)', 
            padding: '1.5rem', 
            borderRadius: '8px',
            display: 'inline-block'
          }}>
            <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', letterSpacing: '1px' }}>
              OFFICIAL AUDIT RECEIPT ID
            </span>
            <strong style={{ fontSize: '1.8rem', color: 'var(--gold)', fontFamily: 'monospace', letterSpacing: '3px' }}>
              TXN-{voterInfo?._id?.substring(18, 24).toUpperCase()}-NAPS
            </strong>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--teal)', marginTop: '1.5rem', fontStyle: 'italic' }}>
            * Please screenshot this receipt for your records.
          </p>
        </div>
      )}

      {error && <div className="error-alert">{error}</div>}
      {success && <div className="success-alert">{success}</div>}

      <div className="positions-list">
        {ballot.map((pos) => {
          const hasVoted = votedPositions.includes(pos.positionId);

          return (
            <div key={pos.positionId} className="position-card">
              <div className="position-header">
                <h3>{pos.positionTitle}</h3>
                {hasVoted && <span className="status-badge voted">Voted</span>}
              </div>

              <div className="candidates-grid">
                {pos.candidates.map((candidate) => (
                <div 
                  key={candidate._id} 
                  className={`candidate-card ${selectedVotes[pos.positionId] === candidate._id ? 'selected' : ''}`}
                  onClick={() => handleSelectCandidate(pos.positionId, candidate._id)}
                >
                  <div className="candidate-photo-container">
                    {candidate.imageUrl ? (
                      <img src={candidate.imageUrl} alt={candidate.fullName} className="candidate-photo" />
                    ) : (
                      <div className="candidate-photo-placeholder">
                        {candidate.fullName.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="candidate-info">
                    <h4>{candidate.fullName}</h4>
                  {candidate.manifesto && (
                      <button 
                        className="manifesto-btn"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevents selecting the candidate when clicking the button
                          setActiveManifesto({ name: candidate.fullName, text: candidate.manifesto });
                        }}
                      >
                        📖 Read Manifesto
                      </button>
                    )}
                    <span className="level-badge">{candidate.level}L</span>
                  </div>

                  <div className="selection-circle"></div>
                </div>
                ))}
              </div>

              {!hasVoted ? (
                <button 
                  className="vote-btn" 
                  onClick={() => castVote(pos.positionId)}
                  disabled={!selectedVotes[pos.positionId]}
                >
                  Cast Vote for {pos.positionTitle}
                </button>
              ) : (
                <div className="voted-overlay">
                  <p>Your vote for this position has been securely recorded.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MANIFESTO MODAL (Pasted right before the final closing div) */}
      {activeManifesto && (
        <div className="modal-overlay" onClick={() => setActiveManifesto(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: 'var(--teal)', marginBottom: '1rem', borderBottom: '1px solid var(--navy-accent)', paddingBottom: '0.5rem' }}>
              {activeManifesto.name}'s Campaign Manifesto
            </h3>
            <p style={{ lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '1.5rem', whiteSpace: 'pre-wrap', maxHeight: '60vh', overflowY: 'auto' }}>
              {activeManifesto.text}
            </p>
            <button className="vote-btn" onClick={() => setActiveManifesto(null)}>Close Window</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Ballot;