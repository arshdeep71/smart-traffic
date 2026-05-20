import axios from 'axios';

const aiApi = axios.create({
  baseURL: 'http://localhost:8001',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = async () => {
  return await aiApi.get('/health');
};

export const getLiveAnalytics = async (useSimulation = true, scenario = 'busy') => {
  return await aiApi.get('/live-analytics', { params: { use_simulation: useSimulation, scenario } });
};

export const getAlerts = async (useSimulation = true, scenario = 'busy') => {
  return await aiApi.get('/alerts', { params: { use_simulation: useSimulation, scenario } });
};

export const getCameraFeeds = async () => {
  return await aiApi.get('/camera-feeds');
};

export const triggerIncident = async (cameraId = null) => {
  return await aiApi.post('/simulate/incident', null, { params: { camera_id: cameraId } });
};

export default aiApi;
