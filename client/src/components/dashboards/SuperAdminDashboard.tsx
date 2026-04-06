import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, ClipboardList, CheckCircle, UserPlus } from "lucide-react";
import apiClient from "@/integrations/api";
import { useNavigate } from "react-router-dom";
import { CreateUserDialog } from "@/components/users/CreateUserDialog";

export function SuperAdminDashboard() {
  const [stats, setStats] = useState({ totalBranches: 0, pendingRequests: 0, totalUsers: 0, activeBranches: 0 });
  const [showCreateUser, setShowCreateUser] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.users.getSuperAdminDashboardStats();
        setStats({
          totalBranches: response.totalBranches || 0,
          pendingRequests: response.pendingRequests || 0,
          totalUsers: response.totalUsers || 0,
          activeBranches: response.activeBranches || 0,
        });
      } catch (error) {
        setStats({ totalBranches: 0, pendingRequests: 0, totalUsers: 0, activeBranches: 0 });
      }
    };
    fetchStats();
  }, []);

  const widgets = [
    { title: "Total Branches", value: stats.totalBranches, icon: Building2, color: "text-blue-600" },
    { title: "Pending Requests", value: stats.pendingRequests, icon: ClipboardList, color: "text-orange-600" },
    { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-green-600" },
    { title: "Active Branches", value: stats.activeBranches, icon: CheckCircle, color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Super Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">System overview, management, and analytics</p>
        </div>
        <Button onClick={() => setShowCreateUser(true)} className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg">
          <UserPlus className="mr-2 h-4 w-4" /> Create User
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {widgets.map((w) => (
          <Card key={w.title} className="hover:shadow-lg transition-all duration-300 cursor-pointer border-0 bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{w.title}</CardTitle>
                <div className={`p-2.5 rounded-lg bg-opacity-10 ${w.color.replace('text', 'bg')}`}>
                  <w.icon className={`h-5 w-5 ${w.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{w.value}</div>
              <p className="text-xs text-muted-foreground mt-1">Total count</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/branches")}>
          <CardHeader><CardTitle className="text-lg">Branch Management</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Manage all branches, assign managers</p></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/branch-requests")}>
          <CardHeader><CardTitle className="text-lg">Branch Requests</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Review pending branch requests</p></CardContent>
        </Card>
      </div>

      <CreateUserDialog open={showCreateUser} onOpenChange={setShowCreateUser} />
    </div>
  );
}
