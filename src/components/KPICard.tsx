import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  comparisonText: string;
  icon: LucideIcon;
  iconBgColor: string;
  iconTextColor: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  isPositive,
  comparisonText,
  icon: Icon,
  iconBgColor,
  iconTextColor,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-lg ${iconBgColor} ${iconTextColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h3>
        <div className={`mt-2 flex items-center space-x-1.5 text-xs font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span>{change}</span>
          <span className="text-slate-500 dark:text-slate-400 font-normal">{comparisonText}</span>
        </div>
      </div>
    </div>
  );
};
