import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logAdminAction } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { Search, Settings, BarChart3 } from 'lucide-react';

interface AIUsageLog {
  id: string;
  user_id: string;
  action: string;
  tokens_used: number;
  created_at: string;
  display_name?: string;
}

interface UserQuota {
  id: string;
  user_id: string;
  daily_limit: number;
  is_enabled: boolean;
  display_name?: string;
}

export default function AIControls() {
  const { user } = useAuth();
  const [usageLogs, setUsageLogs] = useState<AIUsageLog[]>([]);
  const [quotas, setQuotas] = useState<UserQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingQuota, setEditingQuota] = useState<UserQuota | null>(null);

  const fetchData = async () => {
    try {
      // Fetch usage logs
      const { data: logs, error: logsError } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // Fetch quotas
      const { data: quotaData, error: quotaError } = await supabase
        .from('ai_quotas')
        .select('*');

      if (quotaError) throw quotaError;

      // Fetch user profiles for display names
      const userIds = [
        ...new Set([
          ...(logs?.map((l) => l.user_id) || []),
          ...(quotaData?.map((q) => q.user_id) || []),
        ]),
      ];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, p.display_name]) || []
      );

      setUsageLogs(
        logs?.map((l) => ({
          ...l,
          display_name: profileMap.get(l.user_id) || 'Unknown',
        })) || []
      );

      setQuotas(
        quotaData?.map((q) => ({
          ...q,
          display_name: profileMap.get(q.user_id) || 'Unknown',
        })) || []
      );
    } catch (error) {
      console.error('Error fetching AI data:', error);
      toast.error('Failed to fetch AI data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateQuota = async () => {
    if (!editingQuota) return;

    try {
      const { error } = await supabase
        .from('ai_quotas')
        .update({
          daily_limit: editingQuota.daily_limit,
          is_enabled: editingQuota.is_enabled,
        })
        .eq('id', editingQuota.id);

      if (error) throw error;

      await logAdminAction(user!.id, 'UPDATE_AI_QUOTA', editingQuota.user_id, {
        daily_limit: editingQuota.daily_limit,
        is_enabled: editingQuota.is_enabled,
      } as Record<string, number | boolean>);
      toast.success('Quota updated successfully');
      setEditingQuota(null);
      fetchData();
    } catch (error) {
      console.error('Error updating quota:', error);
      toast.error('Failed to update quota');
    }
  };

  const handleToggleEnabled = async (quota: UserQuota) => {
    try {
      const { error } = await supabase
        .from('ai_quotas')
        .update({ is_enabled: !quota.is_enabled })
        .eq('id', quota.id);

      if (error) throw error;

      await logAdminAction(user!.id, 'TOGGLE_AI_QUOTA', quota.user_id, {
        is_enabled: !quota.is_enabled,
      } as Record<string, boolean>);
      toast.success(quota.is_enabled ? 'AI disabled for user' : 'AI enabled for user');
      fetchData();
    } catch (error) {
      console.error('Error toggling quota:', error);
      toast.error('Failed to toggle quota');
    }
  };

  // Calculate stats
  const totalTokensToday = usageLogs
    .filter((l) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(l.created_at) >= today;
    })
    .reduce((sum, l) => sum + (l.tokens_used || 0), 0);

  const totalRequests = usageLogs.length;
  const uniqueUsers = new Set(usageLogs.map((l) => l.user_id)).size;

  const filteredLogs = usageLogs.filter((l) =>
    l.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="AI Controls">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tokens Today</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTokensToday.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRequests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* User Quotas */}
        <Card>
          <CardHeader>
            <CardTitle>User Quotas</CardTitle>
          </CardHeader>
          <CardContent>
            {quotas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No user quotas configured
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Daily Limit</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotas.map((quota) => (
                      <TableRow key={quota.id}>
                        <TableCell className="font-medium">
                          {quota.display_name}
                        </TableCell>
                        <TableCell>
                          {editingQuota?.id === quota.id ? (
                            <Input
                              type="number"
                              value={editingQuota.daily_limit}
                              onChange={(e) =>
                                setEditingQuota({
                                  ...editingQuota,
                                  daily_limit: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-24"
                            />
                          ) : (
                            quota.daily_limit
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={quota.is_enabled}
                            onCheckedChange={() => handleToggleEnabled(quota)}
                          />
                        </TableCell>
                        <TableCell>
                          {editingQuota?.id === quota.id ? (
                            <div className="flex gap-1">
                              <Button size="sm" onClick={handleUpdateQuota}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingQuota(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingQuota(quota)}
                            >
                              Edit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent AI Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No usage logs found
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {log.display_name}
                        </TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>{log.tokens_used}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
