import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Users, FileText, TrendingUp, BarChart3, PieChart, Building2, Activity, Award, Clock, ArrowRight } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

interface Stats {
  totalUsers: number;
  totalEssays: number;
  essaysToday: number;
  avgScore: number;
  totalInstitutions: number;
  activeInstitutions: number;
  newUsersToday: number;
  essaysThisWeek: number;
}

interface DailyData {
  date: string;
  essays: number;
  users: number;
}

interface ExamTypeData {
  name: string;
  value: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalEssays: 0,
    essaysToday: 0,
    avgScore: 0,
    totalInstitutions: 0,
    activeInstitutions: 0,
    newUsersToday: 0,
    essaysThisWeek: 0,
  });
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [examTypeData, setExamTypeData] = useState<ExamTypeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch total users
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch new users today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: newUsersToday } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());

        // Fetch total essays
        const { data: essays, count: essayCount } = await supabase
          .from('essays')
          .select('*', { count: 'exact' });

        // Essays today
        const { count: todayCount } = await supabase
          .from('essays')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());

        // Essays this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { count: weekCount } = await supabase
          .from('essays')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo.toISOString());

        // Fetch institutions
        const { count: totalInstitutions } = await supabase
          .from('institutions')
          .select('*', { count: 'exact', head: true });

        const { count: activeInstitutions } = await supabase
          .from('institutions')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Calculate average score
        const scoredEssays = essays?.filter((e) => e.ai_score !== null) || [];
        const avgScore =
          scoredEssays.length > 0
            ? scoredEssays.reduce((sum, e) => sum + (e.ai_score || 0), 0) /
              scoredEssays.length
            : 0;

        setStats({
          totalUsers: userCount || 0,
          totalEssays: essayCount || 0,
          essaysToday: todayCount || 0,
          avgScore: Math.round(avgScore * 10) / 10,
          totalInstitutions: totalInstitutions || 0,
          activeInstitutions: activeInstitutions || 0,
          newUsersToday: newUsersToday || 0,
          essaysThisWeek: weekCount || 0,
        });

        // Daily essay data for chart (last 7 days)
        const dailyStats: Record<string, { essays: number; users: number }> = {};
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          dailyStats[dateStr] = { essays: 0, users: 0 };
        }

        essays?.forEach((essay) => {
          const date = new Date(essay.created_at);
          const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          if (dailyStats[dateStr]) {
            dailyStats[dateStr].essays++;
          }
        });

        // Daily user data
        const { data: profiles } = await supabase
          .from('profiles')
          .select('created_at');

        profiles?.forEach((profile) => {
          const date = new Date(profile.created_at);
          const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          if (dailyStats[dateStr]) {
            dailyStats[dateStr].users++;
          }
        });

        setDailyData(
          Object.entries(dailyStats).map(([date, data]) => ({
            date,
            essays: data.essays,
            users: data.users,
          }))
        );

        // Exam type distribution
        const examTypes: Record<string, number> = {};
        essays?.forEach((essay) => {
          const type = essay.exam_type || 'Unknown';
          examTypes[type] = (examTypes[type] || 0) + 1;
        });

        setExamTypeData(
          Object.entries(examTypes).map(([name, value]) => ({ name, value }))
        );
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <AdminLayout title="Dashboard">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading stats...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Platform Overview</h2>
            <p className="text-muted-foreground">
              Monitor platform activity, user engagement, and system health at a glance.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.newUsersToday > 0 ? `+${stats.newUsersToday} today` : 'No new users today'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Essays</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEssays}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.essaysToday > 0 ? `${stats.essaysToday} today` : 'No essays today'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '—'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.avgScore > 0 ? 'Across all essays' : 'No scored essays'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Institutions</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalInstitutions}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.activeInstitutions} active
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Essays This Week</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.essaysThisWeek}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last 7 days activity
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Users Today</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.newUsersToday}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  User registrations
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Institutions</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeInstitutions}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Currently active
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-3"
                  onClick={() => navigate('/admin/users')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Manage Users</div>
                    <div className="text-xs text-muted-foreground">View and manage all users</div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-3"
                  onClick={() => navigate('/admin/institutions')}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Manage Institutions</div>
                    <div className="text-xs text-muted-foreground">Institution settings</div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-auto py-3"
                  onClick={() => navigate('/admin/essay-analytics')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Essay Analytics</div>
                    <div className="text-xs text-muted-foreground">Detailed insights</div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity (Last 7 Days)</CardTitle>
                <CardDescription>Essays and new users over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="essays"
                        name="Essays"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="users"
                        name="New Users"
                        stroke="hsl(var(--secondary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--secondary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Essay Distribution by Exam Type</CardTitle>
                <CardDescription>Breakdown of essay types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {examTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={examTypeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} (${(percent * 100).toFixed(0)}%)`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {examTypeData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No essay data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
