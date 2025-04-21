import { useState } from 'react';
import { FaYoutube, FaTiktok, FaInstagram, FaTwitch } from 'react-icons/fa';
import Head from 'next/head';



function formatHoursToHM(hours) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, '0')}`;
}


function YouTubeEmbed({ url }) {
  if (!url) return null;

  const videoId = url.split('/').pop();
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  return (
    <div style={{ position: 'relative', paddingTop: '56.25%' }}>
      <iframe
        src={embedUrl}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: '8px',
        }}
      ></iframe>
    </div>
  );
}

export async function getStaticProps() {
  let sessions;

  try {
    // Always read from filesystem during build
    const fs = require('fs');
    const path = require('path');
    const sessionsPath = path.join(process.cwd(), 'public', 'streaming_sessions.csv');
    const sessionsCsv = fs.readFileSync(sessionsPath, 'utf8');
    sessions = csvToJson(sessionsCsv);

    return {
      props: {
        sessions,
      },
    };
  } catch (error) {
    console.error('Error loading CSV data:', error);
    return {
      props: {
        sessions: [],
        error: 'Failed to load session data'
      }
    };
  }
}

// Keep your existing csvToJson function
function csvToJson(csv) {
  const [header, ...rows] = csv.trim().split('\n');
  const keys = header.split(',');

  return rows.map(row => {
    const vals = row.split(',');
    const entry = {};
    keys.forEach((key, idx) => {
      entry[key] = vals[idx]?.trim() || '';
    });
    return entry;
  });
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
      })).sort((a, b) => new Date(b.date) - new Date(a.date))
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

  const goalHours = 1000;
  const progressPercentage = Math.min(Math.round((totalHours / goalHours) * 100), 100);
  const averageHoursPerDay = activeDays > 0 ? (totalHours / activeDays).toFixed(1) : 0;
  
  return (
    <div style={{ padding: '16px', fontFamily: 'sans-serif', maxWidth: '100%', margin: '0 auto' }}>
<div style={{ 
  textAlign: 'center', 
  marginBottom: '32px',
  padding: '24px 0',
  background: 'linear-gradient(135deg, #f5fbff 0%, #e0f0ff 100%)',
  borderRadius: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
}}>
  <h1 style={{ 
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#1a73e8',
    marginBottom: '16px',
    textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
    letterSpacing: '0.5px'
  }}>
    Mandarin Live Streams
  </h1>
  
  <div style={{
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    alignItems: 'center'
  }}>
    <a href="https://www.youtube.com/@bricelearnstuff" target="_blank" rel="noopener noreferrer">
      <FaYoutube size={28} color="#FF0000" style={{ transition: 'transform 0.2s' }} />
    </a>
    <a href="https://www.tiktok.com/@bricelearnstuff" target="_blank" rel="noopener noreferrer">
      <FaTiktok size={28} color="#000000" style={{ transition: 'transform 0.2s' }} />
    </a>
    <a href="https://www.instagram.com/bricelearnstuff" target="_blank" rel="noopener noreferrer">
      <FaInstagram size={28} color="#E1306C" style={{ transition: 'transform 0.2s' }} />
    </a>
    <a href="https://www.twitch.tv/bricelearnstuff" target="_blank" rel="noopener noreferrer">
      <FaTwitch size={28} color="#6441a5" style={{ transition: 'transform 0.2s' }} />
    </a>
  </div>
</div>

      <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '16px' }}>Statistics</h2>
      
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px', 
        marginBottom: '24px',
      }}>
        {/* Total Hours Card */}
        <div style={{ 
          backgroundColor: '#f5fbff',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#555' }}>TOTAL HOURS in 2025</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a73e8' }}>{Math.round(totalHours)}</div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#555' }}>
            Goal: 1000 hours
          </div>
          <div style={{
            height: '6px',
            backgroundColor: '#e0e0e0',
            borderRadius: '3px',
            marginTop: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${progressPercentage}%`,
              backgroundColor: '#1a73e8',
              borderRadius: '3px',
              transition: 'width 0.5s ease'
            }}></div>
          </div>
          <div style={{ fontSize: '12px', color: '#1a73e8', marginTop: '4px' }}>
            {progressPercentage}% completed
          </div>
        </div>

        {/* Streams Card */}
        <div style={{ 
          backgroundColor: '#f5fbff',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#555' }}>STREAMS</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a73e8' }}>{totalSessions}</div>
        </div>

        {/* Active Days Card */}
        <div style={{ 
          backgroundColor: '#f5fbff',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#555' }}>ACTIVE DAYS</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a73e8' }}>{activeDays}</div>
        </div>

        {/* Avg Hours/Day Card */}
        <div style={{ 
          backgroundColor: '#f5fbff',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#555' }}>AVG HOURS/DAY</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a73e8' }}>{formatHoursToHM(averageHoursPerDay)}</div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
          </div>
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
                  <span>{Math.round(monthData.totalHours)} hours</span>
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
                          <div style={{ flex: 1, marginLeft: '8px', marginRight: '8px' }}>
                          <div style={{
                            position: 'relative',
                            width: '100%',
                            height: '20px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            backdropFilter: 'blur(6px)',
                            WebkitBackdropFilter: 'blur(6px)',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.05) inset',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: barWidth,
                              background: 'linear-gradient(90deg, #4fc3f7, #1e88e5)',
                              borderRadius: '12px',
                              boxShadow: '0 0 8px #1e88e5cc',
                              transition: 'width 0.6s ease',
                              display: 'flex',
                              alignItems: 'center',
                              paddingLeft: '12px',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '12px',
                            }}>
                              {formatHoursToHM(day.totalHours)}
                            </div>
                          </div>
                        </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                
                                <YouTubeEmbed url={session.youtubeLink} />
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
          .slice(0, 3)
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
                <div>{formatHoursToHM(Number(session.hours))}</div>
              </div>

              
              <YouTubeEmbed url={session.youtube_link} />

              </div>
          ))}
      </div>

    </div>
  );
}