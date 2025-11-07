import React, { useMemo } from 'react';
import { CompletedQuiz, Difficulty } from '../types';
import { ChartBarIcon } from './icons';

interface StatisticsViewProps {
  completedQuizzes: CompletedQuiz[];
  t: (key: any, options?: any) => string;
}

interface ChartData {
  label: string;
  value: number;
  color: string;
}

const DonutChart: React.FC<{ data: ChartData[]; size?: number; strokeWidth?: number }> = ({ data, size = 160, strokeWidth = 16 }) => {
    const halfsize = (size * 0.5);
    const radius = halfsize - (strokeWidth * 0.5);
    const circumference = 2 * Math.PI * radius;
    const total = data.reduce((acc, item) => acc + item.value, 0);
    let anggleOffset = -90;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {data.map((item, index) => {
                if (item.value === 0) return null;
                const dashoffset = ((total - item.value) / total) * circumference;
                const transform = `rotate(${anggleOffset} ${halfsize} ${halfsize})`;
                anggleOffset += (item.value / total) * 360;
                return (
                    <circle
                        key={index}
                        cx={halfsize}
                        cy={halfsize}
                        r={radius}
                        strokeWidth={strokeWidth}
                        stroke={item.color}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashoffset}
                        strokeLinecap="round"
                        transform={transform}
                    />
                );
            })}
        </svg>
    );
};

const BarChart: React.FC<{ data: ChartData[]; }> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1); // Avoid division by zero
    
    return (
        <div className="w-full h-64 flex items-end justify-around space-x-2 pt-4">
            {data.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <div 
                        className="w-full rounded-t-md transition-all duration-300" 
                        style={{ height: `${(item.value / maxValue) * 100}%`, backgroundColor: item.color }}
                    >
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-900 text-white text-xs rounded py-1 px-2 relative -top-8 mx-auto w-max">
                            {item.value}
                        </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">{item.label}</span>
                </div>
            ))}
        </div>
    );
};

const StatisticsView: React.FC<StatisticsViewProps> = ({ completedQuizzes, t }) => {
  const stats = useMemo(() => {
    if (completedQuizzes.length === 0) {
      return null;
    }

    const totalQuizzes = completedQuizzes.length;
    const totalCorrect = completedQuizzes.reduce((sum, q) => sum + q.score, 0);
    const totalQuestions = completedQuizzes.reduce((sum, q) => sum + q.totalQuestions, 0);
    const averageScore = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    const byDifficulty = Object.values(Difficulty).map(level => {
      const quizzes = completedQuizzes.filter(q => q.difficulty === level);
      const correct = quizzes.reduce((sum, q) => sum + q.score, 0);
      const total = quizzes.reduce((sum, q) => sum + q.totalQuestions, 0);
      return {
        level,
        average: total > 0 ? (correct / total) * 100 : 0,
        count: quizzes.length,
      };
    });

    const completionTrend = completedQuizzes.reduce((acc, q) => {
        const month = new Date(q.date).toLocaleString('default', { month: 'short', year: '2-digit' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const trendData = Object.entries(completionTrend)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .slice(-6) // Last 6 months
        .map(([label, value]) => ({ label, value, color: 'rgb(var(--primary-500))' }));

    return { totalQuizzes, averageScore, totalCorrect, totalQuestions, byDifficulty, trendData };
  }, [completedQuizzes]);

  if (!stats) {
    return (
      <div className="text-center py-16">
        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('noStatistics')}</h3>
      </div>
    );
  }

  const overallChartData: ChartData[] = [
      { label: t('correctAnswers'), value: stats.totalCorrect, color: 'rgb(34 197 94)' },
      { label: t('incorrectAnswers'), value: stats.totalQuestions - stats.totalCorrect, color: 'rgb(239 68 68)' }
  ];

  const difficultyChartData: ChartData[] = stats.byDifficulty.map(d => ({
    label: t(d.level),
    value: parseFloat(d.average.toFixed(1)),
    color: {
        [Difficulty.Easy]: 'rgb(34 197 94)',
        [Difficulty.Medium]: 'rgb(234 179 8)',
        [Difficulty.Hard]: 'rgb(239 68 68)',
    }[d.level],
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">{t('statistics')}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Overall Performance */}
        <div className="md:col-span-1 lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col items-center justify-center">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">{t('overallPerformance')}</h3>
            <div className="relative">
                <DonutChart data={overallChartData} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-800 dark:text-white">{stats.averageScore.toFixed(1)}%</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('averageScore')}</span>
                </div>
            </div>
             <div className="text-center mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('quizzesCompleted')}: <span className="font-bold text-gray-700 dark:text-gray-200">{stats.totalQuizzes}</span></p>
            </div>
        </div>

        {/* Performance by Difficulty */}
        <div className="md:col-span-1 lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">{t('performanceByDifficulty')}</h3>
             <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('averageScore')}</p>
            <BarChart data={difficultyChartData} />
        </div>

        {/* Quiz Completion Trend */}
        <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">{t('quizCompletionTrend')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('quizzesPerMonth')}</p>
            <BarChart data={stats.trendData} />
        </div>

      </div>
    </div>
  );
};

export default StatisticsView;
