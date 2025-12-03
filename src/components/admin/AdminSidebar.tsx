import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Image,
  MessageSquare,
  BarChart3,
  BookOpen,
  Users,
  Cpu,
  ChevronLeft,
  ExternalLink,
  Building2,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: FileText, label: 'GRE Topics', path: '/admin/gre-topics' },
  { icon: Image, label: 'IELTS Task 1', path: '/admin/ielts-task1' },
  { icon: MessageSquare, label: 'IELTS Task 2', path: '/admin/ielts-task2' },
  { icon: BarChart3, label: 'Essay Analytics', path: '/admin/essay-analytics' },
  { icon: BookOpen, label: 'Vocabulary', path: '/admin/vocabulary' },
  { icon: Users, label: 'User Manager', path: '/admin/users' },
  { icon: Building2, label: 'Institutions', path: '/admin/institutions' },
  { icon: Mail, label: 'Contact Inquiries', path: '/admin/contact-inquiries' },
  { icon: Cpu, label: 'AI Controls', path: '/admin/ai-controls' },
  { icon: MessageSquare, label: 'Peer Feedback', path: '/admin/feedback' },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

export function AdminSidebar({ collapsed, onCollapse }: AdminSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {!collapsed && (
            <h1 className="font-bold text-lg text-foreground">Admin</h1>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCollapse(!collapsed)}
            className={cn(collapsed && 'mx-auto')}
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform',
                collapsed && 'rotate-180'
              )}
            />
          </Button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3',
                  collapsed && 'justify-center px-2'
                )}
                onClick={() => navigate(item.path)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t">
          <Button
            variant="outline"
            className={cn('w-full gap-2', collapsed && 'px-2')}
            onClick={() => navigate('/essay', { replace: true })}
          >
            <ExternalLink className="h-4 w-4" />
            {!collapsed && <span>Go to ScoreWise</span>}
          </Button>
          {!collapsed && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Admin Console — ScoreWise
              <br />
              (Mithil & Hasti)
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
