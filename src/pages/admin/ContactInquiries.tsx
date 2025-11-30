import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Search, Calendar, User, MessageSquare, Filter, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  role: string;
  message: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  teacher: 'Teacher',
  institute_owner: 'Institute Owner',
  collaboration: 'Collaboration Request',
  pricing: 'Pricing Inquiry',
  technical: 'Technical Help',
  other: 'Other',
};

export default function ContactInquiries() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching contact messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contact messages. ' + (error.message || ''),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
    toast({
      title: 'Refreshed',
      description: 'Contact messages updated.',
    });
  };

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || msg.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'pricing':
        return 'default';
      case 'collaboration':
        return 'secondary';
      case 'technical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <AdminLayout title="Contact Inquiries">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Inquiries</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{messages.length}</div>
              <p className="text-xs text-muted-foreground">
                All contact form submissions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  messages.filter((msg) => {
                    const msgDate = new Date(msg.created_at);
                    const now = new Date();
                    return (
                      msgDate.getMonth() === now.getMonth() &&
                      msgDate.getFullYear() === now.getFullYear()
                    );
                  }).length
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Inquiries this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredMessages.length}</div>
              <p className="text-xs text-muted-foreground">
                Currently filtered results
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Messages</CardTitle>
            <CardDescription>
              View and manage all contact form submissions. These are also sent via email to mithil20056mistry@gmail.com
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Messages Table */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading contact messages...
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {messages.length === 0
                  ? 'No contact messages yet.'
                  : 'No messages match your filters.'}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMessages.map((msg) => (
                      <TableRow key={msg.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(msg.created_at), 'MMM d, yyyy')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(msg.created_at), 'h:mm a')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{msg.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <a
                            href={`mailto:${msg.email}`}
                            className="text-primary hover:underline flex items-center gap-2"
                          >
                            <Mail className="h-4 w-4" />
                            {msg.email}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(msg.role)}>
                            {ROLE_LABELS[msg.role] || msg.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-sm line-clamp-2">{msg.message}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                window.location.href = `mailto:${msg.email}?subject=Re: Your ScoreWise Inquiry`;
                              }}
                            >
                              <Mail className="h-4 w-4 mr-1" />
                              Reply
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Details Modal/Expanded View */}
        {filteredMessages.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Message Details</h3>
            {filteredMessages.map((msg) => (
              <Card key={msg.id} className="hidden md:block">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <CardTitle className="text-base">{msg.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Mail className="h-3 w-3" />
                          <a
                            href={`mailto:${msg.email}`}
                            className="text-primary hover:underline"
                          >
                            {msg.email}
                          </a>
                        </CardDescription>
                      </div>
                      <Badge variant={getRoleBadgeVariant(msg.role)}>
                        {ROLE_LABELS[msg.role] || msg.role}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(msg.created_at), 'PPpp')}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Message:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-4 rounded-md">
                        {msg.message}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          window.location.href = `mailto:${msg.email}?subject=Re: Your ScoreWise Inquiry&body=Hi ${msg.name},%0D%0A%0D%0AThank you for contacting ScoreWise.`;
                        }}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Reply via Email
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

