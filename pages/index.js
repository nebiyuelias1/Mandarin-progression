import fs from 'fs';
import path from 'path';
import { useState } from 'react';

export async function getStaticProps() {
  const sessionsPath = path.join(process.cwd(), 'public', 'streaming_sessions.csv');
  const sessionsCsv = fs.readFileSync(sessionsPath, 'utf8');

  function csvToJson(csv) {
    const [header, ...rows] = csv.trim().split('\n');
    const keys = header.split(',');
    
    // Add youtube_link if it's not already in the header
    const updatedKeys = keys.includes('youtube_link') ? keys : [...keys, 'youtube_link'];
    
    return rows.map(row => {
      const vals = row.split(',');
      return Object.fromEntries(updatedKeys.map((k, i) => [k, vals[i] || '']));
    });
  }

  return {
    props: {
      sessions: csvToJson(sessionsCsv)
    }
  };
}

export default function Home({ sessions }) {
  // Process sessions data by month and date
  const processedByMonth = {};
  
  sessions.forEach(session => {
    const date = session.date;
    const [year, month, day] = date.split('-');
    const monthKey = `${year}-${month}`;
    
    // Initialize month data if it doesn't exist
    if (!processedByMonth[monthKey]) {
      processedByMonth[monthKey] = {
        totalHours: 0,
        days: {}
      };
    }
    
    // Initialize day data if it doesn't exist
    if (!processedByMonth[monthKey].days[date]) {
      processedByMonth[monthKey].days[date] = {
        totalHours: 0,
        sessions: []
      };
    }
    
    const hours = Number(session.hours);
    
    // Add session data
    processedByMonth[monthKey].totalHours += hours;
    processedByMonth[monthKey].days[date].totalHours += hours;
    processedByMonth[monthKey].days[date].sessions.push({
      startTime: session.started_time,
      endTime: session.time,
      hours: hours,
      youtubeLink: session.youtube_link || ""
    });
  });
  
  // Convert to array and sort by month
  const monthsData = Object.keys(processedByMonth)
    .map(month => ({
      month,
      monthLabel: new Date(`${month}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      ...processedByMonth[month],
      days: Object.keys(processedByMonth[month].days).map(date => ({
        date,
        dayOfMonth: new Date(date).getDate(),
        ...processedByMonth[month].days[date]
      })).sort((a, b) => new Date(a.date) - new Date(b.date))
    }))
    .sort((a, b) => new Date(`${b.month}-01`) - new Date(`${a.month}-01`));
  
  // Calculate overall metrics
  const totalHours = sessions.reduce((sum, session) => sum + Number(session.hours), 0);
  const activeDays = new Set(sessions.map(s => s.date)).size;
  const totalSessions = sessions.length;
  
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  
  const getMaxHoursInMonth = (days) => {
    return Math.max(...days.map(day => day.totalHours), 3); // Minimum scale of 3
  };
  
  const toggleMonth = (month) => {
    if (expandedMonth === month) {
      setExpandedMonth(null);
      setExpandedDay(null);
    } else {
      setExpandedMonth(month);
      setExpandedDay(null);
    }
  };
  
  const toggleDay = (date) => {
    setExpandedDay(expandedDay === date ? null : date);
  };
  
  return (
    <div style={{ padding: '16px', fontFamily: 'sans-serif', maxWidth: '100%', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>Mandarin Live streams</h1>
      
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        flexWrap: 'wrap', 
        marginBottom: '24px',
        justifyContent: 'space-between'
      }}>
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#f5fbff', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          flex: '1',
          minWidth: '100px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#555' }}>TOTAL HOURS</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a73e8' }}>{totalHours.toFixed(0)}</div>
        </div>
        
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#f5fbff', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          flex: '1',
          minWidth: '100px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#555' }}>STREAMS</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a73e8' }}>{totalSessions}</div>
        </div>
      </div>
      
      <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '16px' }}>Study Activity</h2>
      
      <div style={{ marginBottom: '24px' }}>
        {monthsData.map((monthData, monthIndex) => {
          const maxHours = getMaxHoursInMonth(monthData.days);
          const isMonthExpanded = expandedMonth === monthData.month;
          
          return (
            <div key={monthIndex} style={{ marginBottom: '16px' }}>
              <div 
                onClick={() => toggleMonth(monthData.month)}
                style={{ 
                  padding: '12px', 
                  backgroundColor: isMonthExpanded ? '#1a73e8' : '#f0f0f0', 
                  color: isMonthExpanded ? 'white' : 'black',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{monthData.monthLabel}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{monthData.totalHours.toFixed(1)} hours</span>
                  <span style={{ 
                    transform: isMonthExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s'
                  }}>▼</span>
                </div>
              </div>
              
              {isMonthExpanded && (
                <div style={{ marginTop: '8px', padding: '8px' }}>
                  {monthData.days.map((day, dayIndex) => {
                    const isDayExpanded = expandedDay === day.date;
                    const barWidth = `${(day.totalHours / maxHours) * 100}%`;
                    
                    return (
                      <div key={dayIndex} style={{ marginBottom: '8px' }}>
                        <div 
                          onClick={() => toggleDay(day.date)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            padding: '8px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #eee',
                          }}
                        >
                          <div style={{ width: '40px', textAlign: 'center', fontWeight: 'bold', color: '#555' }}>
                            {day.dayOfMonth}
                          </div>
                          <div style={{ flex: 1, marginLeft: '8px', marginRight: '8px' }}>
                            <div style={{ 
                              height: '16px', 
                              width: barWidth,
                              backgroundColor: '#4aaf07',
                              borderRadius: '3px',
                            }}></div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{day.totalHours.toFixed(1)}h</span>
                            <span style={{ 
                              fontSize: '10px',
                              transform: isDayExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.3s'
                            }}>▼</span>
                          </div>
                        </div>
                        
                        {isDayExpanded && (
                          <div style={{ 
                            padding: '12px', 
                            backgroundColor: '#f9f9f9',
                            borderRadius: '8px',
                            marginTop: '8px'
                          }}>
                            {day.sessions.map((session, sessionIndex) => (
                              <div key={sessionIndex} style={{ 
                                padding: '12px',
                                borderBottom: sessionIndex < day.sessions.length - 1 ? '1px solid #eee' : 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                                  <div>
                                    <span style={{ fontWeight: 'bold' }}>{session.startTime}</span> - {session.endTime}
                                  </div>
                                  <div style={{ fontWeight: 'bold' }}>{session.hours.toFixed(2)}h</div>
                                </div>
                                
                                {session.youtubeLink && (
                                  <div>
                                    <a 
                                      href={session.youtubeLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ 
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '8px 12px',
                                        backgroundColor: '#ff0000',
                                        color: 'white',
                                        borderRadius: '4px',
                                        textDecoration: 'none',
                                        fontWeight: 'bold',
                                        width: '100%'
                                      }}
                                    >
                                      <span>▶</span>
                                      <span>Watch Recording</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '16px' }}>Recent Streams</h2>
      
      <div>
        {sessions
          .sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))
          .slice(0, 5)
          .map((session, index) => (
            <div 
              key={index} 
              style={{ 
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold' }}>{session.date}</div>
                <div>{Number(session.hours).toFixed(2)}h</div>
              </div>
              
              <div style={{ fontSize: '14px', color: '#555', marginBottom: '8px' }}>
                {session.started_time} - {session.time}
              </div>
              
              {session.youtube_link && (
                <a 
                  href={session.youtube_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    backgroundColor: '#ff0000',
                    color: 'white',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                >
                  <span>▶</span>
                  <span>Watch Recording</span>
                </a>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}