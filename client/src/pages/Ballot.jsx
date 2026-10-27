import { useState, useEffect } from 'react';
import API from '../api';

const Ballot = () => {
  const [ballot, setBallot] = useState([]);
  const [votedPositions, setVotedPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState({}); // Stores chosen candidate per position

  useEffect(() => {
    const fetchElectionData = async () => {
      try {
        // Fetch the live ballot
        const ballotRes = await API.get('/election/ballot');
        setBallot(ballotRes.data.ballot);

        // Fetch the current voter's profile to check previously cast votes
        const voterRes = await API.get('/auth/me');
        setVotedPositions(voterRes.data.voter.votedPositions);

        setLoading(false);
      } catch (err) {
        setError('Failed to load secure ballot data. Please log in again.');
        setLoading(false);
      }
    };
    fetchElectionData();
  }, []);

  const handleSelect = (positionId, candidateId) => {
    setSelected({ ...selected, [positionId]: candidateId });
  };

  const castVote = async (positionId) => {
    const candidateId = selected[positionId];
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

  return (
    <div className="ballot-container">
      <div className="ballot-header">
        <h2>Official Election Ballot</h2>
        <p>Select your preferred candidate for each executive position.</p>
      </div>

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
                    className={`candidate-card ${selected[pos.positionId] === candidate._id ? 'selected' : ''} ${hasVoted ? 'disabled' : ''}`}
                    onClick={() => !hasVoted && handleSelect(pos.positionId, candidate._id)}
                  >
                    <div className="candidate-info">
                      <h4>{candidate.fullName}</h4>
                      <span className="candidate-level">{candidate.level} Level</span>
                    </div>
                    <p className="manifesto">"{candidate.manifesto}"</p>
                  </div>
                ))}
              </div>

              {!hasVoted ? (
                <button 
                  className="vote-btn" 
                  onClick={() => castVote(pos.positionId)}
                  disabled={!selected[pos.positionId]}
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
    </div>
  );
};

export default Ballot;