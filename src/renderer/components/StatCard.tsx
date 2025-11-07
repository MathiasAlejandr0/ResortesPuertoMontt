import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

function StatCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon, 
  iconColor 
}: StatCardProps) {
  console.log('🔧 StatCard.tsx: Renderizando tarjeta, título:', title, 'valor:', value);
  
  const getIconClass = () => {
    if (iconColor) return iconColor;
    switch (changeType) {
      case 'positive': return 'icon-green';
      case 'negative': return 'icon-red';
      default: return 'icon-blue';
    }
  };
  
  // Detectar si el valor es muy largo para ajustar el tamaño de fuente
  const valueStr = String(value);
  const isLongValue = valueStr.length > 15;
  const fontSizeClass = isLongValue ? 'text-2xl' : 'text-3xl';
  
  return (
    <Card className="stat-card-animated fade-in-up overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2 min-w-0">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className={`${fontSizeClass} font-bold text-card-foreground tracking-tight break-words overflow-wrap-anywhere`}>
              {value}
            </p>
            {change && (
              <p
                className={`text-sm font-medium flex items-center gap-1 ${
                  changeType === "positive" ? "text-success" :
                  changeType === "negative" ? "text-destructive" :
                  "text-muted-foreground"
                }`}
              >
                {change}
              </p>
            )}
          </div>
          <div className={`flex-shrink-0 rounded-xl p-3.5 shadow-sm ${getIconClass()}`}>
            <Icon className="h-7 w-7" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default React.memo(StatCard);