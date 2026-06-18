'use client';

import { ReactNode } from 'react';

type DashboardTableProps = {
  children: ReactNode;
  /** Optional max height for vertical scroll (e.g. "70vh") */
  maxHeight?: string;
  minWidth?: string;
};

export default function DashboardTable({
  children,
  maxHeight,
  minWidth = '640px',
}: DashboardTableProps) {
  return (
    <div
      className="dashboard-table-shell"
      style={maxHeight ? { maxHeight } : undefined}
    >
      <div
        className="dashboard-table-scroll"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="dashboard-table" style={{ minWidth }}>
          {children}
        </table>
      </div>
    </div>
  );
}
