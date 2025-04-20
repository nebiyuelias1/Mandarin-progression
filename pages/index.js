import fs from 'fs';
import path from 'path';
import { useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend } from 'chart.js';

Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

export async function getStaticProps() {
  const dailyPath = path.join(process.cwd(), 'public', 'daily_summary.csv');
  const sessionsPath = path.join(process.cwd(), 'public', 'streaming_sessions.csv');
  const dailyCsv = fs.readFileSync(dailyPath, 'utf8');
  const sessionsCsv = fs.readFileSync(sessionsPath, 'utf8');

  function csvToJson(csv) {
    const [header, ...rows] = csv.trim().split('\n');
    const keys = header.split(',');
    return rows.map(row => {
      const vals = row.split(',');
      return Object.fromEntries(keys.map((k, i) => [k, vals[i]]));
    });
  }

  return {
    props: {
      daily: csvToJson(dailyCsv),
      sessions: csvToJson(sessionsCsv)
    }
  };
}

function prepareCumulativeData(daily) {
  // ...existing logic, adapted for JS...
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
  const weekHours = {};
  daily.forEach(row => {
    const date = new Date(row.date);
    const week = Number(row.week_num || (date.getWeek ? date.getWeek() : Math.ceil((date - new Date(date.getFullYear(),0,1)) / 604800000)));
    weekHours[week] = (weekHours[week] || 0) + Number(row.hours);
  });
  let cumsum = 0;
  const cumsums = weeks.map(w => {
    cumsum += weekHours[w] || 0;
    return cumsum;
  });
  return { weeks, cumsums };
}

export default function Home({ daily, sessions }) {
  // Metrics
  const totalHours = daily.reduce((a, b) => a + Number(b.hours), 0);
  const totalSessions = daily.reduce((a, b) => a + Number(b.commits), 0);
  const activeDays = daily.filter(d => Number(d.hours) > 0).length;

  // Cumulative chart
  const { weeks, cumsums } = useMemo(() => prepareCumulativeData(daily), [daily]);
  const cumulativeData = {
    labels: weeks,
    datasets: [
      {
        label: 'Cumulative Hours',
        data: cumsums,
        borderColor: '#4aaf07',
        backgroundColor: 'rgba(74,175,7,0.1)',
        fill: true,
        tension: 0.3
      },
      {
        label: 'Goal (1000h)',
        data: weeks.map(() => 1000),
        borderColor: '#444444',
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false,
        type: 'line'
      }
    ]
  };

  // Weekly bar chart
  const weeklyStats = {};
  daily.forEach(row => {
    const week = row.date.slice(0, 4) + '-W' + (row.date ? (new Date(row.date).getWeek ? new Date(row.date).getWeek() : Math.ceil((new Date(row.date) - new Date(new Date(row.date).getFullYear(),0,1)) / 604800000)) : '');
    if (!weeklyStats[week]) weeklyStats[week] = 0;
    weeklyStats[week] += Number(row.hours);
  });
  const weeklyLabels = Object.keys(weeklyStats);
  const weeklyHours = Object.values(weeklyStats);

  const weeklyBarData = {
    labels: weeklyLabels,
    datasets: [
      {
        label: 'Hours per Week',
        data: weeklyHours,
        backgroundColor: '#2ca02c'
      }
    ]
  };

  // Recent sessions
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
      <h1>Mandarin Study Progress in 2025</h1>
      <p>Track my Mandarin learning journey, one session at a time.</p>
      <div style={{ display: 'flex', gap: 32 }}>
        <div>
          <h2>📊 Study Hours Overview</h2>
          <div>Total Study Hours: <b>{totalHours.toFixed(1)}</b></div>
          <div>Total Sessions: <b>{totalSessions}</b></div>
          <div>Active Days: <b>{activeDays}</b></div>
        </div>
        <div style={{ flex: 1 }}>
          <h2>📈 Cumulative Progress</h2>
          <Line data={cumulativeData} options={{
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { min: 0, max: 1000, display: false } }
          }} height={120} />
        </div>
      </div>
      <h2>📅 Weekly Statistics</h2>
      <Bar data={weeklyBarData} options={{
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { autoSkip: true, maxTicksLimit: 12 } } }
      }} height={300} />
      <h2>📝 Recent Sessions</h2>
      <table border="1" cellPadding={4} style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          {recentSessions.map((s, i) => (
            <tr key={i}>
              <td>{s.date}</td>
              <td>{s.started_time}</td>
              <td>{s.time}</td>
              <td>{Number(s.hours).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Helper for week number (ISO)
Date.prototype.getWeek = function() {
  var d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
};
