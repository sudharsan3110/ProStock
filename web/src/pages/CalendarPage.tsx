import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analyticsApi';
import { CalendarEvent } from '../types';
import { Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    analyticsApi.getCalendar().then(setEvents).catch(console.error);
  }, []);

  return (
    <div className="p-4 space-y-4 max-w-[1920px] mx-auto select-none">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Calendar size={20} className="text-accent" />
        <div>
          <h2 className="text-base font-bold text-fg-0">Events & Macro Blackout Timeline</h2>
          <p className="text-xs text-fg-3">Scheduled central bank meetings, earnings dates, and trading blackout windows</p>
        </div>
      </div>

      <div className="pro-card overflow-hidden">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-bg-2 text-fg-3 uppercase text-[11px] border-b border-border">
            <tr>
              <th className="py-2.5 px-4">Date</th>
              <th className="py-2.5 px-4">Market</th>
              <th className="py-2.5 px-4">Macro Event / Release</th>
              <th className="py-2.5 px-4">Impact Severity</th>
              <th className="py-2.5 px-4 text-right">Blackout Enforced</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.map(ev => {
              const isCrit = ev.impact === 'CRITICAL';
              const isHigh = ev.impact === 'HIGH';
              return (
                <tr key={ev.id} className="hover:bg-bg-hover/50">
                  <td className="py-3 px-4 font-bold text-fg-0">{ev.date}</td>
                  <td className="py-3 px-4 text-fg-3">{ev.market}</td>
                  <td className="py-3 px-4 text-fg-1 font-semibold">{ev.event}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isCrit
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : isHigh
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    }`}>
                      {ev.impact}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {ev.blackout ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30">
                        <AlertTriangle size={12} /> Blackout Active
                      </span>
                    ) : (
                      <span className="text-fg-3">None</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
