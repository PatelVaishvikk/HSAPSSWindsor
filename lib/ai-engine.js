/**
 * AI Engine for Smart Networking, Content Curation, and Recommendations
 * Provides intelligent features throughout the platform
 */

// Mock AI responses for development (can be replaced with OpenAI/Anthropic API)
const USE_MOCK_AI = true; // Set to false when API keys are available

/**
 * Calculate smart connection score between two users
 * Uses multi-dimensional analysis: skills, interests, goals, activity
 */
export function calculateConnectionScore(user1, user2) {
  let score = 0;
  const factors = [];

  // Skill overlap
  const skills1 = new Set(user1.community_skills || []);
  const skills2 = new Set(user2.community_skills || []);
  const skillOverlap = [...skills1].filter(s => skills2.has(s)).length;
  if (skillOverlap > 0) {
    const skillScore = Math.min(skillOverlap * 15, 40);
    score += skillScore;
    factors.push({ type: 'skills', score: skillScore, count: skillOverlap });
  }

  // Interest overlap
  const interests1 = new Set(user1.community_interests || []);
  const interests2 = new Set(user2.community_interests || []);
  const interestOverlap = [...interests1].filter(i => interests2.has(i)).length;
  if (interestOverlap > 0) {
    const interestScore = Math.min(interestOverlap * 10, 30);
    score += interestScore;
    factors.push({ type: 'interests', score: interestScore, count: interestOverlap });
  }

  // Same institution
  if (user1.study_institution && user1.study_institution === user2.study_institution) {
    score += 20;
    factors.push({ type: 'institution', score: 20 });
  }

  // Complementary skills (one has what the other needs)
  if (user1.help_offering && user2.community_interests) {
    const helpKeywords = user1.help_offering.toLowerCase().split(/\s+/);
    const needKeywords = user2.community_interests.map(i => i.toLowerCase());
    const matches = helpKeywords.filter(h => needKeywords.some(n => n.includes(h) || h.includes(n)));
    if (matches.length > 0) {
      score += 15;
      factors.push({ type: 'complementary', score: 15 });
    }
  }

  return {
    score: Math.min(score, 100),
    factors,
    recommendation: score > 60 ? 'high' : score > 30 ? 'medium' : 'low'
  };
}

/**
 * Generate personalized conversation starters
 */
export async function generateConversationStarter(currentUser, targetUser) {
  // Enhanced mock AI logic
  if (USE_MOCK_AI) {
    const starters = [];
    
    // Based on shared interests
    const sharedInterests = (currentUser.community_interests || [])
      .filter(i => (targetUser.community_interests || []).includes(i));
    
    if (sharedInterests.length > 0) {
      starters.push(`I noticed we both share an interest in ${sharedInterests[0]}. Have you worked on any projects related to this?`);
      starters.push(`Hi! I see you're also interested in ${sharedInterests[0]}. I'd love to hear your thoughts on recent trends in that area.`);
    }

    // Based on their help offering
    if (targetUser.help_offering) {
      starters.push(`I saw you're offering help with ${targetUser.help_offering}. That's really generous! I'd love to learn more about your experience.`);
    }

    // Based on same institution
    if (currentUser.study_institution === targetUser.study_institution) {
      starters.push(`Hey! I see you're also at ${targetUser.study_institution}. How are you finding the ${targetUser.study_program || 'program'}?`);
    }

    // Based on program/specialization
    if (targetUser.study_program) {
      starters.push(`Hi ${targetUser.first_name}, I'm interested in the ${targetUser.study_program} field. How has your experience been so far?`);
    }

    // Generic professional
    starters.push(`Hi ${targetUser.first_name}! I came across your profile and would love to connect. What are you currently working on?`);
    starters.push(`Hello ${targetUser.first_name}, I'd love to add you to my professional network.`);

    // Return a random starter from the applicable ones to feel more dynamic
    return starters[Math.floor(Math.random() * starters.length)];
  }

  // TODO: Integrate with OpenAI API for more sophisticated starters
  return `Hi ${targetUser.first_name}! I'd love to connect with you.`;
}

/**
 * Analyze network health and provide insights
 */
export function analyzeNetworkHealth(user, connections, interactions) {
  const metrics = {
    totalConnections: connections.length,
    activeConnections: 0,
    diversityScore: 0,
    engagementRate: 0,
    growthRate: 0,
    insights: [],
    recommendations: []
  };

  // Active connections (interacted in last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  metrics.activeConnections = interactions.filter(i => 
    new Date(i.timestamp) > thirtyDaysAgo
  ).length;

  // Diversity score (variety of institutions, programs, skills)
  const institutions = new Set(connections.map(c => c.study_institution).filter(Boolean));
  const programs = new Set(connections.map(c => c.study_program).filter(Boolean));
  metrics.diversityScore = Math.min(
    ((institutions.size * 20) + (programs.size * 10)) / (connections.length || 1) * 100,
    100
  );

  // Engagement rate
  if (connections.length > 0) {
    metrics.engagementRate = (metrics.activeConnections / connections.length) * 100;
  }

  // Generate insights
  if (metrics.engagementRate < 30) {
    metrics.insights.push({
      type: 'warning',
      message: 'Your engagement rate is low. Try reaching out to connections you haven\'t talked to recently.'
    });
  }

  if (metrics.diversityScore < 40) {
    metrics.insights.push({
      type: 'tip',
      message: 'Consider connecting with people from different institutions and programs to diversify your network.'
    });
  }

  if (connections.length < 10) {
    metrics.recommendations.push({
      action: 'grow',
      message: 'Build your network! Aim for at least 10 quality connections to start.'
    });
  }

  return metrics;
}

/**
 * Rank and curate content for personalized feed
 */
export function rankContentForUser(user, contentItems) {
  return contentItems.map(item => {
    let relevanceScore = 50; // Base score

    // Author connection strength
    if (item.authorId && user.connections?.includes(item.authorId)) {
      relevanceScore += 20;
    }

    // Topic relevance
    const userInterests = new Set((user.community_interests || []).map(i => i.toLowerCase()));
    const contentTopics = new Set((item.tags || []).map(t => t.toLowerCase()));
    const topicOverlap = [...userInterests].filter(i => contentTopics.has(i)).length;
    relevanceScore += topicOverlap * 10;

    // Recency
    const ageInHours = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60);
    if (ageInHours < 24) relevanceScore += 15;
    else if (ageInHours < 72) relevanceScore += 10;
    else if (ageInHours > 168) relevanceScore -= 10;

    // Engagement signals
    const engagementScore = (item.likes || 0) + (item.comments || 0) * 2 + (item.shares || 0) * 3;
    relevanceScore += Math.min(engagementScore, 20);

    return {
      ...item,
      relevanceScore: Math.min(relevanceScore, 100)
    };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Suggest optimal times to reach out to a user
 */
export function suggestOptimalContactTime(targetUser, interactionHistory = []) {
  if (interactionHistory.length === 0) {
    return {
      suggestion: 'weekday_afternoon',
      message: 'Best time: Weekday afternoons (2-5 PM)',
      confidence: 'low'
    };
  }

  // Analyze when user is most responsive
  const responsesByHour = {};
  const responsesByDay = {};

  interactionHistory.forEach(interaction => {
    const date = new Date(interaction.timestamp);
    const hour = date.getHours();
    const day = date.getDay();

    responsesByHour[hour] = (responsesByHour[hour] || 0) + 1;
    responsesByDay[day] = (responsesByDay[day] || 0) + 1;
  });

  const bestHour = Object.keys(responsesByHour).reduce((a, b) => 
    responsesByHour[a] > responsesByHour[b] ? a : b
  );

  const bestDay = Object.keys(responsesByDay).reduce((a, b) => 
    responsesByDay[a] > responsesByDay[b] ? a : b
  );

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  return {
    suggestion: `${dayNames[bestDay]}_${bestHour}h`,
    message: `Best time: ${dayNames[bestDay]}s around ${bestHour}:00`,
    confidence: interactionHistory.length > 5 ? 'high' : 'medium'
  };
}

/**
 * Identify skill gaps based on career goals
 */
export function identifySkillGaps(user, targetRole = null) {
  const currentSkills = new Set((user.community_skills || []).map(s => s.toLowerCase()));
  const gaps = [];

  // Common skill requirements by role type
  const roleSkillMap = {
    'software_engineer': ['javascript', 'python', 'git', 'algorithms', 'system design'],
    'data_scientist': ['python', 'statistics', 'machine learning', 'sql', 'data visualization'],
    'product_manager': ['product strategy', 'user research', 'agile', 'analytics', 'communication'],
    'designer': ['figma', 'user research', 'prototyping', 'visual design', 'interaction design'],
    'default': ['communication', 'teamwork', 'problem solving', 'time management']
  };

  const role = targetRole || user.employment_role || 'default';
  const requiredSkills = roleSkillMap[role.toLowerCase().replace(/\s+/g, '_')] || roleSkillMap.default;

  requiredSkills.forEach(skill => {
    if (!currentSkills.has(skill)) {
      gaps.push({
        skill,
        priority: 'high',
        reason: `Important for ${role} role`
      });
    }
  });

  return gaps;
}

/**
 * Predict career trajectory based on current path
 */
export function predictCareerTrajectory(user) {
  const predictions = [];

  // Based on education level
  if (user.study_level === 'masters' || user.study_level === 'meng') {
    predictions.push({
      role: 'Senior Engineer',
      timeframe: '2-3 years',
      probability: 0.7,
      path: 'Continue building technical expertise'
    });
    predictions.push({
      role: 'Technical Lead',
      timeframe: '4-5 years',
      probability: 0.5,
      path: 'Develop leadership and mentoring skills'
    });
  }

  if (user.study_level === 'mba') {
    predictions.push({
      role: 'Product Manager',
      timeframe: '1-2 years',
      probability: 0.6,
      path: 'Focus on product strategy and user research'
    });
    predictions.push({
      role: 'Director',
      timeframe: '5-7 years',
      probability: 0.4,
      path: 'Build management and strategic planning skills'
    });
  }

  return predictions;
}

/**
 * Generate AI-powered insights for content
 */
export async function generateContentInsights(content) {
  if (USE_MOCK_AI) {
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed
    const sentiment = analyzeSentiment(content);
    const topics = extractTopics(content);

    // Generate a dynamic summary based on content length
    let summary = content.substring(0, 150) + '...';
    if (wordCount < 50) {
      summary = content; // Short content is its own summary
    }

    return {
      readingTime: `${readingTime} min read`,
      summary: summary,
      topics: topics,
      sentiment: sentiment,
      aiNote: `This content appears to be ${sentiment} and focuses on ${topics.slice(0, 2).join(' and ')}.`
    };
  }

  // TODO: Integrate with OpenAI for advanced analysis
  return null;
}

/**
 * Extract topics from text (simple keyword extraction)
 */
function extractTopics(text) {
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const wordFreq = {};

  words.forEach(word => {
    if (word.length > 4 && !commonWords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Simple sentiment analysis
 */
function analyzeSentiment(text) {
  const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'good', 'best', 'love'];
  const negativeWords = ['bad', 'terrible', 'awful', 'worst', 'hate', 'poor', 'difficult'];

  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  let score = 0;

  words.forEach(word => {
    if (positiveWords.includes(word)) score++;
    if (negativeWords.includes(word)) score--;
  });

  if (score > 2) return 'positive';
  if (score < -2) return 'negative';
  return 'neutral';
}

export default {
  calculateConnectionScore,
  generateConversationStarter,
  analyzeNetworkHealth,
  rankContentForUser,
  suggestOptimalContactTime,
  identifySkillGaps,
  predictCareerTrajectory,
  generateContentInsights
};
