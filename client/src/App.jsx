import { useState, useEffect } from 'react';
import api from './services/api';
import { Server, Database, CheckCircle2, AlertCircle, RefreshCw, Package } from 'lucide-react';

function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/health');
      setHealth(response.data);
    } catch (err) {
      setError(err.message || 'Unable to connect to StoreOps API server');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-sky-600 text-white p-2 rounded-lg">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">StoreOps</h1>
            <p className="text-xs text-slate-500">Inventory & Order Management System</p>
          </div>
        </div>
        <div className="text-sm font-medium px-3 py-1 bg-sky-50 text-sky-700 rounded-full border border-sky-200">
          Phase 1: Project Setup & Baseline
        </div>
      </header>

      {/* Main Status Container */}
      <main className="max-w-4xl mx-auto px-4 py-12 flex-1 w-full">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">System Initialization Status</h2>
              <p className="text-sm text-slate-500 mt-1">
                Verifying frontend client, backend REST API, and PostgreSQL connection pool.
              </p>
            </div>
            <button
              onClick={checkHealth}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Status
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Backend Server Status Card */}
            <div className="p-6 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-100 text-sky-600 rounded-md">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Backend Server</h3>
                    <p className="text-xs text-slate-500">Node.js + Express.js API</p>
                  </div>
                </div>
                <div className="mt-4">
                  {loading ? (
                    <span className="text-xs text-slate-500">Checking server connectivity...</span>
                  ) : error ? (
                    <div className="flex items-center gap-2 text-rose-600 text-sm font-medium">
                      <AlertCircle className="w-4 h-4" />
                      Server Offline ({error})
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        Server Online (HTTP 200)
                      </div>
                      <p>Uptime: {Math.round(health?.uptime || 0)}s</p>
                      <p>Environment: {health?.environment}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs text-slate-400">
                Port: 5000 | Endpoint: /api/v1/health
              </div>
            </div>

            {/* PostgreSQL Connection Pool Status Card */}
            <div className="p-6 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-md">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">PostgreSQL Pool</h3>
                    <p className="text-xs text-slate-500">node-postgres (`pg.Pool`)</p>
                  </div>
                </div>
                <div className="mt-4">
                  {loading ? (
                    <span className="text-xs text-slate-500">Testing connection...</span>
                  ) : health?.database?.status === 'CONNECTED' ? (
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        Connected to Database
                      </div>
                      <p>Database: {health.database.database}</p>
                      <p>Server Time: {new Date(health.database.time).toLocaleTimeString()}</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-amber-600 font-medium text-sm">
                        <AlertCircle className="w-4 h-4" />
                        Awaiting Database (Phase 2)
                      </div>
                      <p className="text-xs text-slate-500">
                        {health?.database?.error || 'Database service not yet started.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs text-slate-400">
                Connection Pool: Max 20 clients
              </div>
            </div>
          </div>

          {/* Phase 1 Verification Checklist */}
          <div className="mt-8 bg-sky-50/60 border border-sky-100 rounded-lg p-5">
            <h4 className="text-sm font-semibold text-sky-900 mb-3">Phase 1 Architecture Checklist</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-sky-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                Vite + React frontend initialized
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                Tailwind CSS configured & styled
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                Express.js REST API with Helmet & CORS
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                Centralized error handling & standard JSON responses
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                PostgreSQL pg.Pool connection module configured
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                Centralized Axios client with JWT interceptor
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-200 bg-white">
        StoreOps Individual Project &bull; React.js &bull; Express.js &bull; PostgreSQL
      </footer>
    </div>
  );
}

export default App;
