import React, { useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { roadmapData, type RoadmapRow } from "../data/roadmapData";

export const Roadmap = () => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set(["1", "1.1"]));

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getLevel = (id: string) => id.split('.').length;
  
  const isRowVisible = (row: RoadmapRow) => {
    const parts = row.id.split('.');
    if (parts.length === 1) return true;
    
    if (parts.length === 2) {
      return expandedRows.has(parts[0]);
    }
    if (parts.length === 3) {
      return expandedRows.has(parts[0]) && expandedRows.has(`${parts[0]}.${parts[1]}`);
    }
    return true;
  };

  const visibleRows = roadmapData.filter(isRowVisible);

  return (
    <div className="w-full h-full p-6 md:p-10 flex flex-col items-center bg-transparent">
      <div className="max-w-[1400px] w-full bg-white rounded-2xl shadow-md border border-[#173C7A]/10 overflow-hidden flex flex-col h-full max-h-full relative">
        <div className="px-8 py-6 border-b border-[#173C7A]/10 bg-gradient-to-r from-white to-[#306FB8]/5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-[#173C7A]">Roadmap</h2>
            <p className="text-sm text-gray-500 mt-1">Track and manage your career transition phases.</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#F8FAFC]">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 bg-[#173C7A] z-20 shadow-sm">
              <tr>
                <th className="py-5 px-8 text-[11px] font-bold text-white uppercase tracking-wider w-24">ID</th>
                <th className="py-5 px-8 text-[11px] font-bold text-white uppercase tracking-wider w-40">Phase</th>
                <th className="py-5 px-8 text-[11px] font-bold text-white uppercase tracking-wider w-48">Process</th>
                <th className="py-5 px-8 text-[11px] font-bold text-white uppercase tracking-wider min-w-[200px]">Task</th>
                <th className="py-5 px-8 text-[11px] font-bold text-white uppercase tracking-wider w-48">Output</th>
                <th className="py-5 px-8 text-[11px] font-bold text-white uppercase tracking-wider w-48">Worksheet</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const level = getLevel(row.id);
                const isExpandable = level < 3;
                const isExpanded = expandedRows.has(row.id);

                return (
                  <tr 
                    key={row.id} 
                    className={`
                      border-b border-[#173C7A]/10 transition-colors group relative
                      ${level === 1 ? 'bg-[#306FB8]/15 hover:bg-[#306FB8]/20 z-10 relative' : ''}
                      ${level === 2 ? 'bg-[#306FB8]/5 hover:bg-[#306FB8]/10' : ''}
                      ${level === 3 ? 'bg-white hover:bg-[#173C7A]/5' : ''}
                    `}
                  >
                    <td className="py-4 px-8 text-sm whitespace-nowrap align-top relative">
                      <div className="flex items-center gap-2" style={{ paddingLeft: `${(level - 1) * 16}px` }}>
                        {isExpandable ? (
                          <button 
                            onClick={() => toggleRow(row.id)}
                            className="p-1 hover:bg-[#173C7A]/10 rounded-md transition-colors text-[#173C7A] flex items-center justify-center bg-white border border-[#173C7A]/10 shadow-sm"
                          >
                            {isExpanded ? <ChevronDown size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />}
                          </button>
                        ) : (
                          <span className="w-[24px]" />
                        )}
                        <div className="flex items-center gap-2 group/tooltip relative">
                          <span className="font-mono text-[13px] text-gray-500 font-medium">
                            {row.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className={`py-4 px-8 text-[13px] align-top ${level === 1 ? 'text-[#173C7A] font-bold' : 'text-gray-500'}`}>
                      {row.phase}
                    </td>
                    <td className={`py-4 px-8 text-[13px] align-top ${level === 2 ? 'text-[#173C7A] font-semibold' : 'text-gray-500'}`}>
                      {row.process}
                    </td>
                    <td className="py-4 px-8 text-[13px] text-gray-800 leading-relaxed align-top">
                      {row.task}
                    </td>
                    <td className="py-4 px-8 text-[13px] text-gray-600 align-top">
                      {row.output}
                    </td>
                    <td className="py-4 px-8 text-[13px] text-[#306FB8] align-top">
                      {row.worksheet ? (
                        <div className="truncate max-w-[16rem] cursor-pointer hover:underline hover:text-[#173C7A] font-medium" title={row.worksheet}>
                          {row.worksheet}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
