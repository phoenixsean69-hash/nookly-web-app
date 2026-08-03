import Sentiment from 'sentiment';

const sentiment = new Sentiment();

export function analyzeSentiment(text: string): {
  score: number;
  comparative: number;
  category: 'positive' | 'negative' | 'neutral';
  recommendation: string;
} {
  const result = sentiment.analyze(text);
  
  let category: 'positive' | 'negative' | 'neutral';
  let recommendation: string;
  
  if (result.score > 0) {
    category = 'positive';
    recommendation = 'Positive feedback - respond positively and maintain good relations';
  } else if (result.score < 0) {
    category = 'negative';
    recommendation = 'Urgent attention needed - address concerns promptly';
  } else {
    category = 'neutral';
    recommendation = 'Neutral query - provide clear and factual response';
  }
  
  return {
    score: result.score,
    comparative: result.comparative,
    category,
    recommendation,
  };
}

export function getSentimentBadge(sentiment: 'positive' | 'negative' | 'neutral') {
  switch (sentiment) {
    case 'positive':
      return { text: 'Positive', icon: '😊', className: 'bg-blue-100 text-blue-700' };
    case 'negative':
      return { text: 'Negative', icon: '😞', className: 'bg-red-100 text-red-700' };
    default:
      return { text: 'Neutral', icon: '😐', className: 'bg-gray-100 text-gray-700' };
  }
}