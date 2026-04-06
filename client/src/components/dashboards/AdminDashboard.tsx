import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, FileText, Percent } from "lucide-react";
import apiClient from "@/integrations/api";
import { useNavigate } from "react-router-dom";

export function AdminDashboard() {
  const [stats, setStats] = useState({ managers: 0, totalStaff: 0, activePawns: 0, activeRates: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.users.getAdminDashboardStats();
        setStats({
          managers: response.managers || 0,
          totalStaff: response.totalStaff || 0,
          activePawns: response.activePawns || 0,
          activeRates: response.activeRates || 0,
        });
      } catch (error) {
        setStats({ managers: 0, totalStaff: 0, activePawns: 0, activeRates: 0 });
      }
    };
    fetchStats();
  }, []);

  const widgets = [
    { title: "Branch Managers", value: stats.managers, icon: Users, color: "text-blue-600" },
    { title: "Total Staff", value: stats.totalStaff, icon: UserCheck, color: "text-green-600" },
    { title: "Active Pawns", value: stats.activePawns, icon: FileText, color: "text-amber-600" },
    { title: "Interest Rates", value: stats.activeRates, icon: Percent, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage staff, rates, and branch operations</p>
      </div>
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
            <CardContent><div className="text-3xl font-bold text-foreground">{w.value}</div><p className="text-xs text-muted-foreground mt-1">Total count</p></CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/users")}>
          <CardHeader><CardTitle className="text-lg">Staff Management</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Manage staff and branch managers</p></CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/interest-rates")}>
          <CardHeader><CardTitle className="text-lg">Interest Rates</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">Configure interest rates by period</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
