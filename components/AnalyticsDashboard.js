import { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, ProgressBar, Spinner, Tab, Tabs } from 'react-bootstrap';
import { 
  TrendingUp, TrendingDown, Minus, Users, MessageSquare, 
  Award, Target, Clock, BarChart3, PieChart, Activity,
  Zap, Star, Calendar, Eye
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Advanced Personal Analytics Dashboard
 * Comprehensive insights into network health, engagement, growth, and influence
 */
export default function AnalyticsDashboard({ currentUser }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    if (currentUser) {
      fetchAnalytics();
    }
  }, [currentUser, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/personal?range=${timeRange}`, {
        headers: {
          'X-Student-Id': currentUser._id,
          'X-Portal-Secret': currentUser.sessionPassword
        }
      });
      const data = await response.json();
      if (response.ok) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend) => {
    if (trend === 'increasing') return <TrendingUp size={16} className="text-success" />;
    if (trend === 'decreasing') return <TrendingDown size={16} className="text-danger" />;
    return <Minus size={16} className="text-muted" />;
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'success';
    if (score >= 40) return 'warning';
    return 'danger';
  };

  if (loading) {
    return (
      <Card className="analytics-dashboard">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading your analytics...</p>
        </Card.Body>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card className="analytics-dashboard">
        <Card.Body className="text-center py-5">
          <BarChart3 size={48} className="text-muted mb-3" />
          <p className="text-muted">No analytics data available yet.</p>
        </Card.Body>
      </Card>
    );
  }

  // Chart configurations
  const engagementChartData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [{
      label: 'Engagement Score',
      data: [45, 52, 61, analytics.engagement.score],
      borderColor: 'rgb(102, 126, 234)',
      backgroundColor: 'rgba(102, 126, 234, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  const activityChartData = {
    labels: Object.keys(analytics.engagement.byType || {}),
    datasets: [{
      label: 'Activities',
      data: Object.values(analytics.engagement.byType || {}),
      backgroundColor: [
        'rgba(102, 126, 234, 0.8)',
        'rgba(118, 75, 162, 0.8)',
        'rgba(237, 100, 166, 0.8)',
        'rgba(255, 154, 158, 0.8)',
        'rgba(250, 208, 196, 0.8)'
      ]
    }]
  };

  const networkGrowthData = {
    labels: ['3 Months Ago', '2 Months Ago', 'Last Month', 'This Month'],
    datasets: [{
      label: 'Network Size',
      data: [
        Math.max(0, analytics.overview.totalConnections - analytics.growth.newConnectionsThisMonth - analytics.growth.newConnectionsLastMonth - 10),
        Math.max(0, analytics.overview.totalConnections - analytics.growth.newConnectionsThisMonth - analytics.growth.newConnectionsLastMonth),
        analytics.overview.totalConnections - analytics.growth.newConnectionsThisMonth,
        analytics.overview.totalConnections
      ],
      backgroundColor: 'rgba(102, 126, 234, 0.6)',
      borderColor: 'rgb(102, 126, 234)',
      borderWidth: 2
    }]
  };

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <Card className="border-0 shadow-sm mb-4 bg-gradient-analytics text-white">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-1">
                <Activity className="me-2" size={24} />
                Your Analytics Dashboard
              </h4>
              <p className="mb-0 opacity-90">Track your professional growth and network health</p>
            </div>
            <div className="level-badge">
              <div className="text-center">
                <Star size={24} className="mb-1" />
                <div className="h5 mb-0">Level {analytics.gamification?.level || 1}</div>
                <small>{analytics.gamification?.title || 'Newcomer'}</small>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Key Metrics */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="stat-card border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="stat-icon bg-primary-light">
                  <Users size={20} className="text-primary" />
                </div>
                {getTrendIcon(analytics.growth.growthRate > 0 ? 'increasing' : 'stable')}
              </div>
              <h3 className="mb-1">{analytics.overview.totalConnections}</h3>
              <p className="text-muted small mb-0">Total Connections</p>
              <small className="text-success">
                +{analytics.growth.newConnectionsThisMonth} this month
              </small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stat-card border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="stat-icon bg-success-light">
                  <Zap size={20} className="text-success" />
                </div>
                {getTrendIcon(analytics.engagement.trend)}
              </div>
              <h3 className="mb-1">{analytics.engagement.score}</h3>
              <p className="text-muted small mb-0">Engagement Score</p>
              <ProgressBar 
                now={analytics.engagement.score} 
                variant={getScoreColor(analytics.engagement.score)}
                className="mt-2"
                style={{ height: '4px' }}
              />
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stat-card border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="stat-icon bg-warning-light">
                  <Award size={20} className="text-warning" />
                </div>
                <Badge bg="warning">{analytics.influence.level}</Badge>
              </div>
              <h3 className="mb-1">{analytics.influence.score}</h3>
              <p className="text-muted small mb-0">Influence Score</p>
              <small className="text-muted">
                {analytics.influence.reach} total reach
              </small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stat-card border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="stat-icon bg-info-light">
                  <Target size={20} className="text-info" />
                </div>
                <Badge bg="info">{analytics.overview.profileCompleteness}%</Badge>
              </div>
              <h3 className="mb-1">Profile</h3>
              <p className="text-muted small mb-0">Completeness</p>
              <ProgressBar 
                now={analytics.overview.profileCompleteness} 
                variant="info"
                className="mt-2"
                style={{ height: '4px' }}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Detailed Analytics Tabs */}
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Tabs defaultActiveKey="engagement" className="mb-4">
            {/* Engagement Tab */}
            <Tab eventKey="engagement" title={<span><MessageSquare size={16} className="me-1" /> Engagement</span>}>
              <Row>
                <Col md={8}>
                  <h6 className="mb-3">Engagement Trend</h6>
                  <Line 
                    data={engagementChartData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: false },
                        tooltip: { mode: 'index', intersect: false }
                      },
                      scales: {
                        y: { beginAtZero: true, max: 100 }
                      }
                    }}
                  />
                </Col>
                <Col md={4}>
                  <h6 className="mb-3">Activity Breakdown</h6>
                  <Doughnut 
                    data={activityChartData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'bottom' }
                      }
                    }}
                  />
                  <div className="mt-3">
                    <small className="text-muted d-block mb-2">This Week</small>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="small">Weekly Activities:</span>
                      <strong>{analytics.engagement.weeklyActivities}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="small">Monthly Activities:</span>
                      <strong>{analytics.engagement.monthlyActivities}</strong>
                    </div>
                  </div>
                </Col>
              </Row>
            </Tab>

            {/* Growth Tab */}
            <Tab eventKey="growth" title={<span><TrendingUp size={16} className="me-1" /> Growth</span>}>
              <Row>
                <Col md={8}>
                  <h6 className="mb-3">Network Growth</h6>
                  <Bar 
                    data={networkGrowthData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: false }
                      },
                      scales: {
                        y: { beginAtZero: true }
                      }
                    }}
                  />
                </Col>
                <Col md={4}>
                  <h6 className="mb-3">Growth Metrics</h6>
                  <Card className="bg-light border-0 mb-3">
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small text-muted">Growth Rate</span>
                        <Badge bg={analytics.growth.growthRate > 0 ? 'success' : 'secondary'}>
                          {analytics.growth.growthRate > 0 ? '+' : ''}{analytics.growth.growthRate}%
                        </Badge>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small text-muted">Velocity</span>
                        <strong>{analytics.growth.velocity} /week</strong>
                      </div>
                      <hr />
                      <small className="text-muted d-block mb-2">Projections</small>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="small">3 Months:</span>
                        <strong>{analytics.growth.projection.threeMonths}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="small">6 Months:</span>
                        <strong>{analytics.growth.projection.sixMonths}</strong>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Tab>

            {/* Content Tab */}
            <Tab eventKey="content" title={<span><Eye size={16} className="me-1" /> Content</span>}>
              <Row>
                <Col md={6}>
                  <h6 className="mb-3">Content Performance</h6>
                  <div className="stats-grid">
                    <Card className="bg-light border-0 mb-3">
                      <Card.Body className="p-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <p className="text-muted small mb-1">Total Posts</p>
                            <h4 className="mb-0">{analytics.content.totalPosts}</h4>
                          </div>
                          <div className="stat-icon bg-primary-light">
                            <MessageSquare size={24} className="text-primary" />
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                    <Card className="bg-light border-0 mb-3">
                      <Card.Body className="p-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <p className="text-muted small mb-1">Avg Engagement</p>
                            <h4 className="mb-0">{analytics.content.avgEngagement}</h4>
                          </div>
                          <div className="stat-icon bg-success-light">
                            <Activity size={24} className="text-success" />
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </div>
                  {analytics.content.bestTime && (
                    <Card className="border-primary">
                      <Card.Body className="p-3">
                        <div className="d-flex align-items-center">
                          <Clock size={20} className="text-primary me-2" />
                          <div>
                            <small className="text-muted d-block">Best Time to Post</small>
                            <strong>{analytics.content.bestTime.label}</strong>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  )}
                </Col>
                <Col md={6}>
                  <h6 className="mb-3">Top Performing Content</h6>
                  {analytics.content.topPerforming.map((item, idx) => (
                    <Card key={idx} className="mb-2 border-0 bg-light">
                      <Card.Body className="p-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <p className="mb-1 small fw-bold">{item.title || 'Untitled'}</p>
                            <div className="d-flex gap-3">
                              <small className="text-muted">👍 {item.likes || 0}</small>
                              <small className="text-muted">💬 {item.comments || 0}</small>
                              <small className="text-muted">🔄 {item.shares || 0}</small>
                            </div>
                          </div>
                          <Badge bg="primary">#{idx + 1}</Badge>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </Col>
              </Row>
            </Tab>

            {/* Influence Tab */}
            <Tab eventKey="influence" title={<span><Star size={16} className="me-1" /> Influence</span>}>
              <Row>
                <Col md={6}>
                  <h6 className="mb-3">Influence Breakdown</h6>
                  <Card className="bg-light border-0 mb-3">
                    <Card.Body>
                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-2">
                          <span className="small">Overall Score</span>
                          <Badge bg={getScoreColor(analytics.influence.score)} className="px-3">
                            {analytics.influence.score}/100
                          </Badge>
                        </div>
                        <ProgressBar 
                          now={analytics.influence.score} 
                          variant={getScoreColor(analytics.influence.score)}
                        />
                      </div>
                      <hr />
                      <div className="d-flex justify-content-between mb-2">
                        <span className="small text-muted">Total Reach</span>
                        <strong>{analytics.influence.reach.toLocaleString()}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="small text-muted">Engagement</span>
                        <strong>{analytics.influence.engagement}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="small text-muted">Helpfulness</span>
                        <strong>{analytics.influence.helpfulness} assists</strong>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <h6 className="mb-3">Topic Expertise</h6>
                  {analytics.influence.topicExpertise.map((topic, idx) => (
                    <Card key={idx} className="mb-2 border-0 bg-light">
                      <Card.Body className="p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <strong className="small">{topic.topic}</strong>
                          <Badge bg={
                            topic.level === 'expert' ? 'success' :
                            topic.level === 'intermediate' ? 'primary' : 'secondary'
                          }>
                            {topic.level}
                          </Badge>
                        </div>
                        <div className="d-flex justify-content-between">
                          <small className="text-muted">{topic.posts} posts</small>
                          <ProgressBar 
                            now={(topic.posts / 15) * 100} 
                            style={{ width: '60%', height: '6px' }}
                            variant="info"
                          />
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </Col>
              </Row>
            </Tab>

            {/* Time Investment Tab */}
            <Tab eventKey="time" title={<span><Clock size={16} className="me-1" /> Time & ROI</span>}>
              <Row>
                <Col md={6}>
                  <h6 className="mb-3">Time Investment</h6>
                  <Card className="bg-gradient-time text-white border-0 mb-3">
                    <Card.Body className="text-center py-4">
                      <h2 className="mb-1">{analytics.timeInvestment.totalHours}h</h2>
                      <p className="mb-0 opacity-90">Total Time Invested</p>
                      <small className="opacity-75">
                        ~{analytics.timeInvestment.avgPerWeek}h per week
                      </small>
                    </Card.Body>
                  </Card>
                  <Card className="border-0 bg-light">
                    <Card.Body>
                      <h6 className="mb-3">Time Breakdown</h6>
                      {Object.entries(analytics.timeInvestment.breakdown).map(([type, minutes]) => (
                        <div key={type} className="mb-2">
                          <div className="d-flex justify-content-between mb-1">
                            <small className="text-capitalize">{type.replace('_', ' ')}</small>
                            <small>{Math.round(minutes / 60 * 10) / 10}h</small>
                          </div>
                          <ProgressBar 
                            now={(minutes / analytics.timeInvestment.totalHours / 60) * 100}
                            style={{ height: '6px' }}
                            variant="primary"
                          />
                        </div>
                      ))}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <h6 className="mb-3">Return on Investment</h6>
                  <Card className={`border-0 mb-3 ${
                    analytics.timeInvestment.roi.rating === 'excellent' ? 'bg-success' :
                    analytics.timeInvestment.roi.rating === 'good' ? 'bg-primary' : 'bg-warning'
                  } text-white`}>
                    <Card.Body className="text-center py-4">
                      <h2 className="mb-1">{analytics.timeInvestment.roi.score}</h2>
                      <p className="mb-0 opacity-90">Value Points per Hour</p>
                      <Badge bg="light" text="dark" className="mt-2">
                        {analytics.timeInvestment.roi.rating.toUpperCase()} ROI
                      </Badge>
                    </Card.Body>
                  </Card>
                  <Card className="border-0 bg-light">
                    <Card.Body>
                      <p className="small text-muted mb-2">
                        <Zap size={16} className="me-1" />
                        {analytics.timeInvestment.roi.message}
                      </p>
                      <hr />
                      <small className="text-muted">
                        Keep engaging with your network to maximize your return on time invested!
                      </small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      <style jsx>{`
        .bg-gradient-analytics {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .bg-gradient-time {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .stat-card {
          transition: transform 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bg-primary-light {
          background: rgba(102, 126, 234, 0.1);
        }

        .bg-success-light {
          background: rgba(40, 167, 69, 0.1);
        }

        .bg-warning-light {
          background: rgba(255, 193, 7, 0.1);
        }

        .bg-info-light {
          background: rgba(23, 162, 184, 0.1);
        }

        .level-badge {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 1rem;
          backdrop-filter: blur(10px);
        }
      `}</style>
    </div>
  );
}
