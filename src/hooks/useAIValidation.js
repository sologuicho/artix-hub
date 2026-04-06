import { useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const buildUrl = (endpoint, mode = 'validate') => {
  const baseUrl = `${BACKEND_URL}/api/validate/${endpoint}`;
  return mode === 'validate' ? baseUrl : `${baseUrl}?mode=${mode}`;
};

const useAIValidation = (endpoint) => {
  const [status, setStatus] = useState('idle'); // idle | running | error | success
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isImproving, setIsImproving] = useState(false);

  const callEndpoint = async (mode, payload) => {
    const url = buildUrl(endpoint, mode);
    
    // Get CSRF token
    const getCsrfToken = () => {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrf') return value;
      }
      return null;
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': getCsrfToken() || ''
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.details || 'Validation request failed');
    }

    return response.json();
  };

  const validate = async (payload) => {
    setStatus('running');
    setError(null);
    try {
      const data = await callEndpoint('validate', payload);
      setResult(data);
      setStatus('success');
      return data;
    } catch (err) {
      setError(err.message);
      setStatus('error');
      throw err;
    }
  };

  const applyImprovements = async (payload) => {
    setIsImproving(true);
    try {
      const data = await callEndpoint('improve', payload);
      setIsImproving(false);
      return data;
    } catch (err) {
      setIsImproving(false);
      setError(err.message);
      throw err;
    }
  };

  return {
    status,
    result,
    error,
    isImproving,
    validate,
    applyImprovements,
  };
};

export default useAIValidation;

