import React from 'react';
import { Database } from 'lucide-react';

interface DbmsConceptBannerProps {
  concept: string;
  description: string;
  sqlHint?: string;
}

export function DbmsConceptBanner({ concept, description, sqlHint }: DbmsConceptBannerProps) {
  return (
    <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#0B3D91]/10 text-[#0B3D91] shrink-0">
          <Database className="w-3.5 h-3.5" />
        </span>
        <p className="leading-snug truncate">
          <span className="font-semibold text-[#0B3D91]">Concept: {concept}</span>
          <span className="mx-1.5 text-slate-400">·</span>
          <span className="text-slate-600">{description}</span>
        </p>
      </div>
      {sqlHint && (
        <code className="font-mono text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 shrink-0">
          {sqlHint}
        </code>
      )}
    </div>
  );
}
