/**
 * Analytics Engine for Personal Dashboards and Insights
 * Tracks and analyzes user activity, engagement, and growth
 */

/**
 * Calculate comprehensive personal analytics
 */
export function calculatePersonalAnalytics(user, activities, connections, content) {
  const analytics = {
    overview: calculateOverview(user, activities, connections),
    engagement: calculateEngagement(activities),
    growth: calculateGrowth(connections, activities),
    content: calculateContentMetrics(content),
    influence: calculateInfluence(user, content, activities),
    timeInvestment: calculateTimeInvestment(activities)
  };

  return analytics;
}

/**
 * Overview metrics
 */
function calculateOverview(user, activities, connections) {
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const recentActivities = activities.filter(a => new Date(a.timestamp) > weekAgo);
  const monthActivities = activities.filter(a => new Date(a.timestamp) > monthAgo);

  return {
    totalConnections: connections.length,
    weeklyActivity: recentActivities.length,
    monthlyActivity: monthActivities.length,
    profileCompleteness: calculateProfileCompleteness(user),
    memberSince: user.created_at,
    lastActive: user.last_portal_login_at || user.updated_at
  };
}

/**
 * Calculate profile completeness percentage
 */
function calculateProfileCompleteness(user) {
  const fields = [
    'first_name', 'last_name', 'mail_id', 'phone',
    'study_institution', 'study_program',
    'community_headline', 'community_bio',
    'community_skills', 'community_interests'
  ];

  let completed = 0;
  fields.forEach(field => {
    const value = user[field];
    if (value && (Array.isArray(value) ? value.length > 0 : value.trim())) {
      completed++;
    }
  });

  return Math.round((completed / fields.length) * 100);
}

/**
 * Engagement metrics
 */
function calculateEngagement(activities) {
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const weekActivities = activities.filter(a => new Date(a.timestamp) > weekAgo);
  const monthActivities = activities.filter(a => new Date(a.timestamp) > monthAgo);

  // Group by type
  const byType = {};
  activities.forEach(activity => {
    byType[activity.type] = (byType[activity.type] || 0) + 1;
  });

  // Calculate engagement score (0-100)
  const score = Math.min(
    (weekActivities.length * 5) + (monthActivities.length * 2),
    100
  );

  return {
    score,
    weeklyActivities: weekActivities.length,
    monthlyActivities: monthActivities.length,
    byType,
    trend: calculateTrend(activities)
  };
}

/**
 * Calculate trend (increasing, stable, decreasing)
 */
function calculateTrend(activities) {
  const now = new Date();
  const thisWeek = activities.filter(a => 
    new Date(a.timestamp) > new Date(now - 7 * 24 * 60 * 60 * 1000)
  ).length;
  const lastWeek = activities.filter(a => {
    const date = new Date(a.timestamp);
    return date > new Date(now - 14 * 24 * 60 * 60 * 1000) &&
           date <= new Date(now - 7 * 24 * 60 * 60 * 1000);
  }).length;

  if (thisWeek > lastWeek * 1.2) return 'increasing';
  if (thisWeek < lastWeek * 0.8) return 'decreasing';
  return 'stable';
}

/**
 * Growth metrics
 */
function calculateGrowth(connections, activities) {
  const now = new Date();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

  // New connections by period
  const newConnectionsThisMonth = connections.filter(c => 
    new Date(c.connected_at) > monthAgo
  ).length;

  const newConnectionsLastMonth = connections.filter(c => {
    const date = new Date(c.connected_at);
    return date > new Date(now - 60 * 24 * 60 * 60 * 1000) &&
           date <= monthAgo;
  }).length;

  // Growth rate
  const growthRate = newConnectionsLastMonth > 0
    ? ((newConnectionsThisMonth - newConnectionsLastMonth) / newConnectionsLastMonth) * 100
    : newConnectionsThisMonth > 0 ? 100 : 0;

  // Network velocity (connections per week)
  const velocity = connections.length > 0
    ? (newConnectionsThisMonth / 4).toFixed(1)
    : 0;

  return {
    newConnectionsThisMonth,
    newConnectionsLastMonth,
    growthRate: Math.round(growthRate),
    velocity,
    projection: projectGrowth(connections)
  };
}

/**
 * Project future growth
 */
function projectGrowth(connections) {
  if (connections.length < 5) {
    return { threeMonths: connections.length + 10, sixMonths: connections.length + 25 };
  }

  // Simple linear projection based on recent growth
  const now = new Date();
  const recentConnections = connections.filter(c => 
    new Date(c.connected_at) > new Date(now - 90 * 24 * 60 * 60 * 1000)
  ).length;

  const monthlyRate = recentConnections / 3;

  return {
    threeMonths: Math.round(connections.length + (monthlyRate * 3)),
    sixMonths: Math.round(connections.length + (monthlyRate * 6))
  };
}

/**
 * Content performance metrics
 */
function calculateContentMetrics(content) {
  if (!content || content.length === 0) {
    return {
      totalPosts: 0,
      totalEngagement: 0,
      avgEngagement: 0,
      topPerforming: [],
      bestTime: null
    };
  }

  const totalEngagement = content.reduce((sum, item) => 
    sum + (item.likes || 0) + (item.comments || 0) + (item.shares || 0), 0
  );

  const avgEngagement = totalEngagement / content.length;

  // Top performing content
  const topPerforming = [...content]
    .sort((a, b) => {
      const scoreA = (a.likes || 0) + (a.comments || 0) * 2 + (a.shares || 0) * 3;
      const scoreB = (b.likes || 0) + (b.comments || 0) * 2 + (b.shares || 0) * 3;
      return scoreB - scoreA;
    })
    .slice(0, 5);

  // Best time to post (analyze when posts get most engagement)
  const bestTime = analyzeBestPostingTime(content);

  return {
    totalPosts: content.length,
    totalEngagement,
    avgEngagement: Math.round(avgEngagement * 10) / 10,
    topPerforming,
    bestTime
  };
}

/**
 * Analyze best time to post
 */
function analyzeBestPostingTime(content) {
  const hourlyPerformance = {};

  content.forEach(item => {
    const hour = new Date(item.created_at).getHours();
    const engagement = (item.likes || 0) + (item.comments || 0) + (item.shares || 0);
    
    if (!hourlyPerformance[hour]) {
      hourlyPerformance[hour] = { total: 0, count: 0 };
    }
    hourlyPerformance[hour].total += engagement;
    hourlyPerformance[hour].count++;
  });

  let bestHour = 14; // Default to 2 PM
  let bestAvg = 0;

  Object.entries(hourlyPerformance).forEach(([hour, data]) => {
    const avg = data.total / data.count;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestHour = parseInt(hour);
    }
  });

  return {
    hour: bestHour,
    label: `${bestHour}:00 - ${bestHour + 1}:00`,
    avgEngagement: Math.round(bestAvg * 10) / 10
  };
}

/**
 * Calculate influence metrics
 */
function calculateInfluence(user, content, activities) {
  // Influence score based on multiple factors
  let score = 0;

  // Content reach
  const totalReach = content.reduce((sum, item) => 
    sum + (item.views || 0), 0
  );
  score += Math.min(totalReach / 100, 30);

  // Engagement quality
  const totalEngagement = content.reduce((sum, item) => 
    sum + (item.likes || 0) + (item.comments || 0) * 2 + (item.shares || 0) * 3, 0
  );
  score += Math.min(totalEngagement / 10, 30);

  // Helping others
  const helpActivities = activities.filter(a => 
    a.type === 'help_response' || a.type === 'mentoring'
  ).length;
  score += Math.min(helpActivities * 2, 20);

  // Consistency
  const now = new Date();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const recentActivities = activities.filter(a => new Date(a.timestamp) > monthAgo);
  const consistency = recentActivities.length > 20 ? 20 : recentActivities.length;
  score += consistency;

  // Topic expertise (based on focused content)
  const topicExpertise = calculateTopicExpertise(content);

  return {
    score: Math.min(Math.round(score), 100),
    level: score > 70 ? 'high' : score > 40 ? 'medium' : 'growing',
    reach: totalReach,
    engagement: totalEngagement,
    helpfulness: helpActivities,
    topicExpertise
  };
}

/**
 * Calculate topic expertise
 */
function calculateTopicExpertise(content) {
  const topicCounts = {};

  content.forEach(item => {
    (item.tags || []).forEach(tag => {
      topicCounts[tag] = (topicCounts[tag] || 0) + 1;
    });
  });

  return Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({
      topic,
      posts: count,
      level: count > 10 ? 'expert' : count > 5 ? 'intermediate' : 'beginner'
    }));
}

/**
 * Calculate time investment and ROI
 */
function calculateTimeInvestment(activities) {
  // Estimate time spent on different activities
  const timeByType = {
    'message': 2, // minutes per message
    'post': 10, // minutes per post
    'comment': 3,
    'help_response': 15,
    'profile_update': 5,
    'networking': 5
  };

  let totalMinutes = 0;
  const breakdown = {};

  activities.forEach(activity => {
    const minutes = timeByType[activity.type] || 5;
    totalMinutes += minutes;
    breakdown[activity.type] = (breakdown[activity.type] || 0) + minutes;
  });

  const hours = Math.round(totalMinutes / 60 * 10) / 10;

  return {
    totalHours: hours,
    breakdown,
    avgPerWeek: Math.round((totalMinutes / 7) / 60 * 10) / 10,
    roi: calculateROI(activities, totalMinutes)
  };
}

/**
 * Calculate ROI on time investment
 */
function calculateROI(activities, totalMinutes) {
  // Value gained from activities
  const connections = activities.filter(a => a.type === 'connection').length;
  const helpReceived = activities.filter(a => a.type === 'help_received').length;
  const learnings = activities.filter(a => a.type === 'learning').length;

  const value = (connections * 10) + (helpReceived * 15) + (learnings * 20);
  const roi = totalMinutes > 0 ? (value / (totalMinutes / 60)).toFixed(1) : 0;

  return {
    score: roi,
    rating: roi > 10 ? 'excellent' : roi > 5 ? 'good' : 'fair',
    message: `You're gaining ${roi} value points per hour invested`
  };
}

/**
 * Generate weekly insights report
 */
export function generateWeeklyInsights(analytics, previousWeek = null) {
  const insights = [];

  // Growth insights
  if (analytics.growth.growthRate > 20) {
    insights.push({
      type: 'success',
      title: 'Network Growing Fast!',
      message: `Your network grew by ${analytics.growth.growthRate}% this month. Keep it up!`
    });
  }

  // Engagement insights
  if (analytics.engagement.trend === 'decreasing') {
    insights.push({
      type: 'warning',
      title: 'Engagement Dropping',
      message: 'Your activity has decreased. Try engaging with your network this week.'
    });
  }

  // Content insights
  if (analytics.content.topPerforming.length > 0) {
    const top = analytics.content.topPerforming[0];
    insights.push({
      type: 'info',
      title: 'Top Performing Content',
      message: `Your post about "${top.title || 'recent topic'}" got ${top.likes || 0} likes!`
    });
  }

  // Profile completeness
  if (analytics.overview.profileCompleteness < 80) {
    insights.push({
      type: 'tip',
      title: 'Complete Your Profile',
      message: `Your profile is ${analytics.overview.profileCompleteness}% complete. Add more details to attract connections.`
    });
  }

  return insights;
}

export default {
  calculatePersonalAnalytics,
  generateWeeklyInsights
};
