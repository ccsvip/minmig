import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default client;

// API types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  username: string;
}

export interface Connection {
  id: number;
  name: string;
  endpoint: string;
  access_key: string;
  use_ssl: boolean;
  region: string;
  created_at: string;
  updated_at: string;
}

export interface ConnectionForm {
  name: string;
  endpoint: string;
  access_key: string;
  secret_key: string;
  use_ssl: boolean;
  region?: string;
}

export interface BucketInfo {
  name: string;
  creation_date?: string;
}

export interface MigrationTask {
  id: number;
  name: string;
  source_conn_id: number;
  source_bucket: string;
  target_conn_id: number;
  target_bucket: string;
  status: string;
  total_objects: number;
  copied_objects: number;
  total_bytes: number;
  copied_bytes: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskForm {
  name: string;
  source_conn_id: number;
  source_bucket: string;
  target_conn_id: number;
  target_bucket: string;
}

export interface TaskLog {
  id: number;
  task_id: number;
  level: string;
  message: string;
  object_key: string | null;
  created_at: string;
}

export interface ProgressEvent {
  task_id: number;
  status: string;
  copied_objects: number;
  total_objects: number;
  copied_bytes: number;
  total_bytes: number;
  message: string;
}
