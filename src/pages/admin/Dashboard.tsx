import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, FileText, TrendingUp, BarChart3, PieChart } from 'lucide-react';
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

interface Stats {
  totalUsers: number;
  totalEssays: number;
  essaysToday: number;
  avgScore: number;
}

interface DailyData {
  date: string;
  essays: number;
}

interface ExamTypeData {
  name: string;
  value: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalEssays: 0,
    essaysToday: 0,
    avgScore: 0,
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

        // Fetch total essays
        const { data: essays, count: essayCount } = await supabase
          .from('essays')
          .select('*', { count: 'exact' });

        // Essays today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: todayCount } = await supabase
          .from('essays')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());

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
        });

        // Daily essay data for chart (last 7 days)
        const dailyStats: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          dailyStats[dateStr] = 0;
        }

        essays?.forEach((essay) => {
          const date = new Date(essay.created_at);
          const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          if (dailyStats[dateStr] !== undefined) {
            dailyStats[dateStr]++;
          }
        });

        setDailyData(
          Object.entries(dailyStats).map(([date, essays]) => ({
            date,
            essays,
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
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Essays</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEssays}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Essays Today</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.essaysToday}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgScore}</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Essays (Last 7 Days)</CardTitle>
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
                      <Line
                        type="monotone"
                        dataKey="essays"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Essay Distribution by Exam Type</CardTitle>
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
