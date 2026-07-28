import { useTheme } from "@/contexts/theme-context";

interface StatsCardProps {
  title: string;
  value: number | string;
  color: string;
  icon?: React.ReactNode;
  properties?: Array<{
    $id?: string;
    propertyName?: string;
    name?: string;
    views?: number;
    likes?: number;
    requests?: number;
    revenue?: number;
    status?: string;
    responseRate?: number;
    isAvailable?: boolean;
  }>;
  statId?: string;
  description?: string;
  trend?: {
    value: string;
    isUp: boolean;
  };
  actions?: React.ReactNode;
}

export function StatsCard({ 
  title, 
  value, 
  color, 
  icon,
  properties, 
  statId,
  description,
  trend,
  actions
}: StatsCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const getPropertyValue = (prop: any, id?: string) => {
    if (id === 'totalViews' || id === 'views') return prop.views || 0;
    if (id === 'totalProperties' || id === 'properties') return prop.views || 0;
    if (id === 'activeListings') return prop.views || 0;
    if (id === 'likes') return prop.likes || 0;
    if (id === 'requests') return prop.requests || 0;
    if (id === 'monthlyRevenue') return prop.revenue || 0;
    if (id === 'occupancyRate') return prop.views || 0;
    if (id === 'responseRate') return prop.responseRate || 0;
    return prop.views || 0;
  };
  
  const getValueLabel = (id?: string) => {
    if (id === 'totalViews' || id === 'views') return 'views';
    if (id === 'totalProperties' || id === 'properties') return 'views';
    if (id === 'activeListings') return 'views';
    if (id === 'likes') return 'likes';
    if (id === 'requests') return 'requests';
    if (id === 'monthlyRevenue') return 'revenue';
    if (id === 'occupancyRate') return 'views';
    if (id === 'responseRate') return 'requests';
    return '';
  };

  const hasPropertyData = properties && properties.length > 0;

  // Color mapping
  const colorMap = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-400/15 via-blue-500/5 to-blue-600/10 dark:from-blue-400/5 dark:via-blue-500/5 dark:to-blue-600/10',
      border: 'border-blue-400/20 dark:border-blue-400/15',
      icon: 'text-blue-500 dark:text-blue-400',
      value: 'text-blue-600 dark:text-blue-300',
      dot: 'bg-blue-400 dark:bg-blue-400',
      text: 'text-gray-600 dark:text-gray-300',
      textMuted: 'text-gray-400 dark:text-gray-400',
      glow: 'bg-blue-400/5 dark:bg-blue-400/5',
      trendUp: 'text-green-500 dark:text-green-400',
      trendDown: 'text-red-500 dark:text-red-400',
      ring: 'ring-blue-400/30 dark:ring-blue-400/20',
      ringBg: 'bg-blue-50/50 dark:bg-blue-950/20',
    },
    red: {
      bg: 'bg-gradient-to-br from-red-400/15 via-red-500/5 to-red-600/10 dark:from-red-400/5 dark:via-red-500/5 dark:to-red-600/10',
      border: 'border-red-400/20 dark:border-red-400/15',
      icon: 'text-red-500 dark:text-red-400',
      value: 'text-red-600 dark:text-red-300',
      dot: 'bg-red-400 dark:bg-red-400',
      text: 'text-gray-600 dark:text-gray-300',
      textMuted: 'text-gray-400 dark:text-gray-400',
      glow: 'bg-red-400/5 dark:bg-red-400/5',
      trendUp: 'text-green-500 dark:text-green-400',
      trendDown: 'text-red-500 dark:text-red-400',
      ring: 'ring-red-400/30 dark:ring-red-400/20',
      ringBg: 'bg-red-50/50 dark:bg-red-950/20',
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-400/15 via-purple-500/5 to-purple-600/10 dark:from-purple-400/5 dark:via-purple-500/5 dark:to-purple-600/10',
      border: 'border-purple-400/20 dark:border-purple-400/15',
      icon: 'text-purple-500 dark:text-purple-400',
      value: 'text-purple-600 dark:text-purple-300',
      dot: 'bg-purple-400 dark:bg-purple-400',
      text: 'text-gray-600 dark:text-gray-300',
      textMuted: 'text-gray-400 dark:text-gray-400',
      glow: 'bg-purple-400/5 dark:bg-purple-400/5',
      trendUp: 'text-green-500 dark:text-green-400',
      trendDown: 'text-red-500 dark:text-red-400',
      ring: 'ring-purple-400/30 dark:ring-purple-400/20',
      ringBg: 'bg-purple-50/50 dark:bg-purple-950/20',
    },
    green: {
      bg: 'bg-gradient-to-br from-green-400/15 via-green-500/5 to-green-600/10 dark:from-green-400/5 dark:via-green-500/5 dark:to-green-600/10',
      border: 'border-green-400/20 dark:border-green-400/15',
      icon: 'text-green-500 dark:text-green-400',
      value: 'text-green-600 dark:text-green-300',
      dot: 'bg-green-400 dark:bg-green-400',
      text: 'text-gray-600 dark:text-gray-300',
      textMuted: 'text-gray-400 dark:text-gray-400',
      glow: 'bg-green-400/5 dark:bg-green-400/5',
      trendUp: 'text-green-500 dark:text-green-400',
      trendDown: 'text-red-500 dark:text-red-400',
      ring: 'ring-green-400/30 dark:ring-green-400/20',
      ringBg: 'bg-green-50/50 dark:bg-green-950/20',
    },
    yellow: {
      bg: 'bg-gradient-to-br from-yellow-400/15 via-yellow-500/5 to-yellow-600/10 dark:from-yellow-400/5 dark:via-yellow-500/5 dark:to-yellow-600/10',
      border: 'border-yellow-400/20 dark:border-yellow-400/15',
      icon: 'text-yellow-500 dark:text-yellow-400',
      value: 'text-yellow-600 dark:text-yellow-300',
      dot: 'bg-yellow-400 dark:bg-yellow-400',
      text: 'text-gray-600 dark:text-gray-300',
      textMuted: 'text-gray-400 dark:text-gray-400',
      glow: 'bg-yellow-400/5 dark:bg-yellow-400/5',
      trendUp: 'text-green-500 dark:text-green-400',
      trendDown: 'text-red-500 dark:text-red-400',
      ring: 'ring-yellow-400/30 dark:ring-yellow-400/20',
      ringBg: 'bg-yellow-50/50 dark:bg-yellow-950/20',
    },
    cyan: {
      bg: 'bg-gradient-to-br from-cyan-400/15 via-cyan-500/5 to-cyan-600/10 dark:from-cyan-400/5 dark:via-cyan-500/5 dark:to-cyan-600/10',
      border: 'border-cyan-400/20 dark:border-cyan-400/15',
      icon: 'text-cyan-500 dark:text-cyan-400',
      value: 'text-cyan-600 dark:text-cyan-300',
      dot: 'bg-cyan-400 dark:bg-cyan-400',
      text: 'text-gray-600 dark:text-gray-300',
      textMuted: 'text-gray-400 dark:text-gray-400',
      glow: 'bg-cyan-400/5 dark:bg-cyan-400/5',
      trendUp: 'text-green-500 dark:text-green-400',
      trendDown: 'text-red-500 dark:text-red-400',
      ring: 'ring-cyan-400/30 dark:ring-cyan-400/20',
      ringBg: 'bg-cyan-50/50 dark:bg-cyan-950/20',
    },
    teal: {
      bg: 'bg-gradient-to-br from-teal-400/15 via-teal-500/5 to-teal-600/10 dark:from-teal-400/5 dark:via-teal-500/5 dark:to-teal-600/10',
      border: 'border-teal-400/20 dark:border-teal-400/15',
      icon: 'text-teal-500 dark:text-teal-400',
      value: 'text-teal-600 dark:text-teal-300',
      dot: 'bg-teal-400 dark:bg-teal-400',
      text: 'text-gray-600 dark:text-gray-300',
      textMuted: 'text-gray-400 dark:text-gray-400',
      glow: 'bg-teal-400/5 dark:bg-teal-400/5',
      trendUp: 'text-green-500 dark:text-green-400',
      trendDown: 'text-red-500 dark:text-red-400',
      ring: 'ring-teal-400/30 dark:ring-teal-400/20',
      ringBg: 'bg-teal-50/50 dark:bg-teal-950/20',
    },
  };

  const colors = colorMap[color as keyof typeof colorMap] || colorMap.blue;

  // Calculate max value for progress bars
  const maxValue = hasPropertyData 
    ? Math.max(...properties.map(p => getPropertyValue(p, statId)), 1) 
    : 1;

  // Check if this is a response rate card
  const isResponseRate = statId === 'responseRate';

  return (
    <div className={`
      relative rounded-xl 
      ${colors.bg}
      border ${colors.border}
      p-5
      shadow-sm
      overflow-hidden
      backdrop-blur-sm
      bg-white/60 dark:bg-black/10
      transition-all duration-300
      hover:shadow-md
      group
      flex flex-col
    `}>
      {/* Subtle glow effects */}
      <div className={`absolute -top-24 -right-24 w-64 h-64 ${colors.glow} rounded-full blur-3xl opacity-50`} />
      <div className={`absolute -bottom-24 -left-24 w-64 h-64 ${colors.glow} rounded-full blur-3xl opacity-50`} />
      
      {/* --- SECTION 1: HEADER - CENTERED WITH RING --- */}
      <div className="relative text-center">
        {trend && (
          <div className="absolute top-0 right-0">
            <div className={`
              flex items-center gap-1 text-xs 
              bg-white/60 dark:bg-black/20
              px-2 py-1 rounded-full 
              backdrop-blur-sm
              border ${colors.border}
              ${trend.isUp ? colors.trendUp : colors.trendDown}
            `}>
              <span>{trend.isUp ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
            </div>
          </div>
        )}

        {/* --- TITLE & VALUE WITH CIRCLE/RING --- */}
        <div className={`
          relative inline-flex flex-col items-center justify-center
          w-30 h-30 sm:w-30 sm:h-30
          rounded-full
          ${colors.ringBg}
          ring-2 ${colors.ring}
          shadow-lg
          transition-all duration-300
          group-hover:scale-105 group-hover:shadow-xl
          mx-auto
          p-4
        `}>
          {icon && (
            <div className={`mb-1 ${colors.icon}`}>
              {icon}
            </div>
          )}

          <p className={`text-[10px] font-medium uppercase tracking-wider ${colors.textMuted}`}>
            {title}
          </p>

          <p className={`text-2xl sm:text-3xl font-bold ${colors.value} leading-tight`}>
            {value}
          </p>

          {description && (
            <p className={`text-[8px] ${colors.textMuted} mt-0.5`}>
              {description}
            </p>
          )}
        </div>
      </div>

      {/* --- SECTION 2: DIVIDER --- */}
      <div className={`h-px w-full ${colors.border} my-3 relative`} />

      {/* --- SECTION 3: PROPERTIES LIST --- */}
      {hasPropertyData ? (
        <div className="relative flex-1">
          <div className="space-y-1.5">
            {properties.slice(0, 5).map((prop, idx) => {
              const propValue = getPropertyValue(prop, statId);
              const valueLabel = getValueLabel(statId);
              const percentage = maxValue > 0 ? (propValue / maxValue) * 100 : 0;
              const hasData = propValue > 0;
              
              return (
                <div 
                  key={prop.$id || idx} 
                  className={`
                    flex items-center justify-between 
                    p-1.5 rounded-lg
                    ${hasData ? 'hover:bg-white/50 dark:hover:bg-black/20 cursor-pointer' : ''}
                    transition-all duration-200
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                    <span className={`text-sm ${colors.text} truncate`}>
                      {prop.propertyName || prop.name || 'Unnamed Property'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Mini progress bar */}
                    {hasData && (
                      <div className="w-12 h-1 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${colors.dot}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    )}
                    <span className={`font-medium text-sm ${colors.value}`}>
                      {propValue.toLocaleString()}
                      <span className={`text-xs ${colors.textMuted} ml-1`}>
                        {valueLabel}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {properties.length > 5 && (
            <div className={`text-xs ${colors.textMuted} italic text-center pt-1`}>
              +{properties.length - 5} more properties
            </div>
          )}
        </div>
      ) : (
        <div className="relative flex-1 flex items-center justify-center py-4">
          <p className={`text-sm ${colors.textMuted} italic flex items-center gap-2`}>
            <span className="text-lg">📭</span>
            No requests yet
          </p>
        </div>
      )}

      {/* --- SECTION 4: ACTIONS --- */}
      {actions && (
        <div className={`mt-3 pt-2 border-t ${colors.border}`}>
          {actions}
        </div>
      )}
    </div>
  );
}