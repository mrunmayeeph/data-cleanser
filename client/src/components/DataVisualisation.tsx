// client/src/components/DataVisualization.tsx
import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { QualityReport } from '../api_service';

interface DataVisualizationProps {
  qualityReport: QualityReport;
}

const COLORS = {
  primary: '#2563eb',
  secondary: '#7c3aed',
  accent: '#06b6d4',
  success: '#16a34a',
  warning: '#f59e0b',
  error: '#dc2626',
};

const DataVisualization: React.FC<DataVisualizationProps> = ({ qualityReport }) => {
  // Data type distribution
  const dataTypeData = Object.entries(qualityReport.column_analysis).reduce((acc, [col, analysis]) => {
    const dtype = analysis.dtype;
    const existing = acc.find(item => item.name === dtype);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: dtype, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Missing data distribution
  const missingDataColumns = Object.entries(qualityReport.column_analysis)
    .map(([col, analysis]) => ({
      name: col.length > 12 ? col.substring(0, 12) + '...' : col,
      missing: analysis.missing_percentage,
      complete: 100 - analysis.missing_percentage
    }))
    .filter(item => item.missing > 0)
    .slice(0, 10); // Top 10 columns with missing data

  // Data quality pie chart
  const qualityData = [
    { name: 'Complete', value: qualityReport.total_cells - qualityReport.missing_cells },
    { name: 'Missing', value: qualityReport.missing_cells },
  ];

  // Heatmap data - showing missing values pattern
  const columns = Object.keys(qualityReport.column_analysis).slice(0, 10);
  const heatmapData = columns.map(col => {
    const analysis = qualityReport.column_analysis[col];
    const missingPercent = analysis.missing_percentage;
    return {
      column: col,
      status: missingPercent === 0 ? 'complete' : missingPercent < 10 ? 'partial' : 'missing',
      percentage: missingPercent
    };
  });

  return (
    <div className="visualizations-section">
      <h3>Data Quality Visualizations</h3>
      
      <div className="viz-grid">
        {/* Data Type Distribution */}
        <div className="viz-card">
          <h4>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            Data Type Distribution
          </h4>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dataTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data Quality Overview */}
        <div className="viz-card">
          <h4>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Data Completeness
          </h4>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={qualityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill={COLORS.success} />
                  <Cell fill={COLORS.error} />
                </Pie>
                <Tooltip formatter={(value) => typeof value === 'number' ? value.toLocaleString() : value} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Missing Data by Column */}
        {missingDataColumns.length > 0 && (
          <div className="viz-card" style={{ gridColumn: '1 / -1' }}>
            <h4>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              Missing Data by Column (Top 10)
            </h4>
            <div className="chart-container" style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={missingDataColumns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--surface)', 
                      border: '1px solid var(--border)',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="complete" stackId="a" fill={COLORS.success} name="Complete %" />
                  <Bar dataKey="missing" stackId="a" fill={COLORS.error} name="Missing %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Missing Values Heatmap */}
        <div className="viz-card" style={{ gridColumn: '1 / -1' }}>
          <h4>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            Missing Values Heatmap
          </h4>
          <div className="heatmap-container">
            <div className="heatmap-grid">
              <div className="heatmap-row">
                {heatmapData.map((item) => (
                  <div
                    key={item.column}
                    className={`heatmap-cell ${item.status}`}
                    title={`${item.column}: ${item.percentage.toFixed(1)}% missing`}
                  >
                    {item.percentage.toFixed(0)}%
                  </div>
                ))}
              </div>
            </div>
            <div className="heatmap-legend">
              <div className="legend-item">
                <div className="legend-color" style={{ background: '#22c55e' }}></div>
                <span>0% Missing (Complete)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: '#fbbf24' }}></div>
                <span>&lt;10% Missing</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: '#ef4444' }}></div>
                <span>≥10% Missing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataVisualization;