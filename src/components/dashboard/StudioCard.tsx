import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface StudioCardProps {
  path: string;
  title: string;
  description: string;
  icon: LucideIcon;
  emoji: string;
  colorClass: string;
  delay?: number;
}

export function StudioCard({
  path,
  title,
  description,
  icon: Icon,
  emoji,
  colorClass,
  delay = 0,
}: StudioCardProps) {
  return (
    <Link
      to={path}
      className="group block animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border/50 p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-5`} />
        </div>
        
        <div className="relative z-10">
          <div className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br ${colorClass} mb-4 transition-transform duration-300 group-hover:scale-110`}>
            <span className="text-2xl">{emoji}</span>
          </div>
          
          <h3 className="text-lg font-semibold mb-2 group-hover:gradient-text transition-all duration-300">
            {title}
          </h3>
          
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
    </Link>
  );
}