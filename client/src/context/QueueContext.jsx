import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext.jsx';
import { toast } from 'sonner';

const QueueContext = createContext();

export const QueueProvider = ({ children }) => {
  const { socket, isConnected } = useSocket();
  const [queueState, setQueueState] = useState({
    clinic: null,
    session: null,
    activeToken: null,
    waitingTokens: [],
    completedCount: 0,
    skippedCount: 0,
    totalWaiting: 0,
    etaSummary: {
      averageConsultationTime: 8,
      etaConfidence: 'Low',
      etaSource: 'Clinic Default',
      completedCount: 0,
      loadLevel: 'LIGHT',
      totalQueueMinutes: 0,
      delayDetected: false,
      extraDelayMinutes: 0,
    },
    events: [],
    loading: true,
    error: null,
  });

  const [currentClinicId, setCurrentClinicId] = useState(null);

  // Set snapshot state
  const setSnapshot = useCallback((data) => {
    setQueueState((prev) => ({
      ...prev,
      clinic: data.clinic,
      session: data.session,
      activeToken: data.activeToken,
      waitingTokens: data.waitingTokens || [],
      completedCount: data.completedCount || 0,
      skippedCount: data.skippedCount || 0,
      totalWaiting: data.totalWaiting || 0,
      etaSummary: data.etaSummary || prev.etaSummary,
      events: data.events || [],
      loading: false,
      error: null,
    }));
  }, []);

  // Fetch queue state from server (REST fallback)
  const fetchQueueSnapshot = useCallback(async (clinicId) => {
    if (!clinicId) return;
    
    setQueueState((prev) => ({ ...prev, loading: true }));
    try {
      const response = await fetch(`/api/queue/${clinicId}/snapshot`);
      const resData = await response.json();
      
      if (resData.status === 'success') {
        setSnapshot(resData.data);
        setCurrentClinicId(clinicId);
      } else {
        throw new Error(resData.message || 'Failed to fetch queue snapshot');
      }
    } catch (err) {
      console.error('Error fetching snapshot:', err);
      setQueueState((prev) => ({ ...prev, loading: false, error: err.message }));
      toast.error('Failed to connect to server. Using local cache.');
    }
  }, [setSnapshot]);

  // Join Socket Room on clinic selection
  useEffect(() => {
    if (socket && isConnected && currentClinicId) {
      socket.emit('join_clinic', currentClinicId);
      console.log(`Instructed socket to join clinic room: ${currentClinicId}`);
    }
  }, [socket, isConnected, currentClinicId]);

  // Listen for Socket events
  useEffect(() => {
    if (!socket) return;

    const handleQueueUpdated = (newSnapshot) => {
      console.log('Socket broadcast received: queue_updated', newSnapshot);
      setSnapshot(newSnapshot);
      toast.info('Queue updated in real-time');
    };

    socket.on('queue_updated', handleQueueUpdated);

    return () => {
      socket.off('queue_updated', handleQueueUpdated);
    };
  }, [socket, setSnapshot]);

  // REST API Methods for Queue actions
  const addPatient = async (clinicId, patientData) => {
    try {
      const response = await fetch(`/api/queue/${clinicId}/patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData),
      });
      const res = await response.json();
      if (res.status === 'success') {
        toast.success(`Token ${res.data.token.tokenNumber} added successfully`);
        return res.data.token;
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to add patient');
      throw error;
    }
  };

  const callNext = async (clinicId) => {
    try {
      const response = await fetch(`/api/queue/${clinicId}/call-next`, {
        method: 'POST',
      });
      const res = await response.json();
      if (res.status === 'success') {
        toast.success(`Called Token ${res.data.token.tokenNumber}`);
        return res.data.token;
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to call next patient');
      throw error;
    }
  };

  const completeCurrent = async (clinicId) => {
    try {
      const response = await fetch(`/api/queue/${clinicId}/complete-current`, {
        method: 'POST',
      });
      const res = await response.json();
      if (res.status === 'success') {
        toast.success(`Completed Token ${res.data.token.tokenNumber}`);
        return res.data.token;
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to complete patient');
      throw error;
    }
  };

  const skipToken = async (clinicId, tokenId) => {
    try {
      const response = await fetch(`/api/queue/${clinicId}/token/${tokenId}/skip`, {
        method: 'POST',
      });
      const res = await response.json();
      if (res.status === 'success') {
        toast.success(`Token ${res.data.token.tokenNumber} skipped`);
        return res.data.token;
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to skip token');
      throw error;
    }
  };

  const rejoinToken = async (clinicId, tokenId, rejoinOption = 'next') => {
    try {
      const response = await fetch(`/api/queue/${clinicId}/token/${tokenId}/rejoin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejoinOption }),
      });
      const res = await response.json();
      if (res.status === 'success') {
        toast.success(`Token ${res.data.token.tokenNumber} rejoined the queue`);
        return res.data.token;
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to rejoin token');
      throw error;
    }
  };

  const cancelToken = async (clinicId, tokenId) => {
    try {
      const response = await fetch(`/api/queue/${clinicId}/token/${tokenId}/cancel`, {
        method: 'POST',
      });
      const res = await response.json();
      if (res.status === 'success') {
        toast.success(`Token ${res.data.token.tokenNumber} cancelled`);
        return res.data.token;
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to cancel token');
      throw error;
    }
  };

  const pauseQueue = async (clinicId, reason) => {
    try {
      const response = await fetch(`/api/queue/${clinicId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const res = await response.json();
      if (res.status === 'success') {
        toast.warning(`Queue paused: ${reason || 'Doctor Break'}`);
        return res.data.clinic;
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to pause queue');
      throw error;
    }
  };

  const resumeQueue = async (clinicId) => {
    try {
      const response = await fetch(`/api/queue/${clinicId}/resume`, {
        method: 'POST',
      });
      const res = await response.json();
      if (res.status === 'success') {
        toast.success('Queue resumed successfully');
        return res.data.clinic;
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to resume queue');
      throw error;
    }
  };

  const undoLastAction = async (clinicId) => {
    try {
      const response = await fetch(`/api/queue/${clinicId}/undo-last`, {
        method: 'POST',
      });
      const res = await response.json();
      if (res.status === 'success') {
        toast.success('Last action undone successfully');
        return res.data.token;
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to undo action');
      throw error;
    }
  };

  return (
    <QueueContext.Provider value={{
      ...queueState,
      fetchQueueSnapshot,
      addPatient,
      callNext,
      completeCurrent,
      skipToken,
      rejoinToken,
      cancelToken,
      pauseQueue,
      resumeQueue,
      undoLastAction,
      currentClinicId,
      setCurrentClinicId
    }}>
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) throw new Error('useQueue must be used within a QueueProvider');
  return context;
};
