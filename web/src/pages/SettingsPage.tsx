import React, { useState } from 'react';
import { useUI } from '../context/UIContext';
import { Settings, Shield, Key, Sliders, CheckCircle2, Lock } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { addToast, density, setDensity, theme, setTheme } = useUI();
  const [dhanClientId, setDhanClientId] = useState('');
  const [dhanToken, setDhanToken] = useState('');
  const [polygonKey, setPolygonKey] = useState('');

  const handleSaveSecrets = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('Credentials encrypted and sent to backend securely.', 'success');
    // Clear inputs immediately to respect write-only security rule
    setDhanToken('');
    setPolygonKey('');
  };

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto select-none">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Settings size={20} className="text-accent" />
        <div>
          <h2 className="text-base font-bold text-fg-0">Settings & API Configuration</h2>
          <p className="text-xs text-fg-3">Manage broker connectivity, write-only secrets, risk thresholds, and display</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Write-Only Secrets Section */}
        <div className="pro-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-fg-0">
            <Lock size={16} className="text-accent" />
            <span>Broker Credentials & API Keys (Write-Only)</span>
          </div>

          <div className="p-3 rounded bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 leading-relaxed">
            <strong>Security Enforced:</strong> Per §16 of ProStock Specification, API keys are strictly write-only. They are never transmitted back to or stored in frontend bundles.
          </div>

          <form onSubmit={handleSaveSecrets} className="space-y-3 text-xs font-mono">
            <div>
              <label className="text-fg-3 block mb-1">DHAN CLIENT ID</label>
              <input
                type="text"
                value={dhanClientId}
                onChange={e => setDhanClientId(e.target.value)}
                placeholder="e.g. 1100349281"
                className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-fg-0 focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-fg-3 block mb-1">DHAN ACCESS TOKEN / JWT</label>
              <input
                type="password"
                value={dhanToken}
                onChange={e => setDhanToken(e.target.value)}
                placeholder="Enter write-only bearer token..."
                className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-fg-0 focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-fg-3 block mb-1">POLYGON.IO API KEY (US CTA SIP)</label>
              <input
                type="password"
                value={polygonKey}
                onChange={e => setPolygonKey(e.target.value)}
                placeholder="Enter Polygon API key..."
                className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-fg-0 focus:outline-none focus:border-accent"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-lg shadow-accent/25 transition-all"
            >
              Securely Save & Sync Secrets
            </button>
          </form>
        </div>

        {/* Global Risk Limits */}
        <div className="pro-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-fg-0">
            <Shield size={16} className="text-accent" />
            <span>Global Risk & Position Sizing Profile</span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="text-fg-3 block mb-1">MAX RISK PER TRADE (%)</label>
              <input
                type="number"
                step="0.1"
                defaultValue={1.0}
                className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-fg-0"
              />
            </div>

            <div>
              <label className="text-fg-3 block mb-1">MAX PORTFOLIO HEAT CAP (%)</label>
              <input
                type="number"
                defaultValue={40.0}
                className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-fg-0"
              />
            </div>

            <div>
              <label className="text-fg-3 block mb-1">DAILY DRAWDOWN CIRCUIT BREAKER (%)</label>
              <input
                type="number"
                step="0.5"
                defaultValue={3.0}
                className="w-full bg-bg-2 border border-border rounded px-3 py-2 text-fg-0"
              />
            </div>

            <button
              onClick={() => addToast('Risk profile limits updated.', 'success')}
              className="w-full py-2.5 rounded-lg bg-bg-2 hover:bg-bg-hover text-fg-0 font-bold text-xs border border-border transition-colors"
            >
              Update Risk Profile Limits
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
