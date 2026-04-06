import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import apiClient from "@/integrations/api";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { CreateUserDialog } from "@/components/users/CreateUserDialog";
import { PinManagementDialog } from "@/components/users/PinManagementDialog";
import { AdvancedSearchPanel, type FilterValue } from "@/components/ui/AdvancedSearchPanel";
import { UserPlus, ChevronLeft, ChevronRight, Lock, Filter } from "lucide-react";

interface User {
  id: string;
  full_name: string;
  email: string;
  roles: string[];
  branchName: string;
}

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: "destructive",
  ADMIN: "default",
  MANAGER: "secondary",
  STAFF: "outline",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [selectedUserForPin, setSelectedUserForPin] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const { role } = useAuth();

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterRole, setFilterRole] = useState<string[]>([]);
  const [filterBranch, setFilterBranch] = useState("");

  const fetchUsers = useCallback(async (name?: string | null, email?: string | null, roleFilter?: string | null, branch?: string | null) => {
    try {
      setLoading(true);
      // Use filter API if any filters are provided, otherwise use paginated API
      const hasFilters = name || email || roleFilter || branch;

      const response = hasFilters
        ? await apiClient.users.filter(name || undefined, email || undefined, roleFilter || undefined, branch || undefined, currentPage, pageSize, "fullName", "asc")
        : await apiClient.users.getPaginated(currentPage, pageSize, "fullName", "asc");

      const normalized: User[] = response.content.map((u: Record<string, unknown>) => ({
        id: u.id as string,
        full_name: u.fullName as string,
        email: u.email as string,
        roles: u.role ? [u.role as string] : [],
        branchName: (u.branch as string) || "—",
      }));
      setUsers(normalized);
      setTotalPages(response.totalPages as number);
      setTotalElements(response.totalElements as number);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    const selectedRole = filterRole.length === 1 ? filterRole[0] : undefined;
    fetchUsers(
      filterName || undefined,
      filterEmail || undefined,
      selectedRole,
      filterBranch || undefined
    );
  }, [currentPage, pageSize, filterName, filterEmail, filterRole, filterBranch, fetchUsers]);

  const handleSearch = (filters: Record<string, FilterValue>) => {
    const name = typeof filters.name === "string" ? filters.name : "";
    const email = typeof filters.email === "string" ? filters.email : "";
    const branch = typeof filters.branch === "string" ? filters.branch : "";
    const roleFilter = Array.isArray(filters.role)
      ? filters.role.filter((value): value is string => typeof value === "string")
      : [];

    setFilterName(name);
    setFilterEmail(email);
    setFilterRole(roleFilter);
    setFilterBranch(branch);
    setCurrentPage(0);
  };

  const hasActiveFilters = filterName !== "" || filterEmail !== "" || filterRole.length > 0 || filterBranch !== "";

  return (
    <>
      <LoadingOverlay isLoading={loading} message="Loading users..." />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">User Management</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              disabled={loading}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 bg-slate-600 text-white">
                  {[filterName, filterEmail, filterRole.length > 0 ? "role" : "", filterBranch].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            {(role === "SUPERADMIN" || role === "ADMIN") && (
              <Button onClick={() => setShowCreate(true)} disabled={loading}>
                <UserPlus className="mr-2 h-4 w-4" /> Create User
              </Button>
            )}
          </div>
        </div>

        {/* Filter Panel using AdvancedSearchPanel */}
        {showFilters && (
          <AdvancedSearchPanel
            title="User Filters"
            subtitle="Search users by name, email, role, or branch"
            inputFields={[
              {
                name: "name",
                label: "Name",
                placeholder: "Enter name...",
              },
              {
                name: "email",
                label: "Email",
                placeholder: "Enter email...",
              },
              {
                name: "branch",
                label: "Branch",
                placeholder: "Enter branch name...",
              },
            ]}
            checkboxGroups={[
              {
                name: "role",
                label: "Role",
                options: [
                  { label: "Superadmin", value: "SUPERADMIN" },
                  { label: "Admin", value: "ADMIN" },
                  { label: "Manager", value: "MANAGER" },
                  { label: "Staff", value: "STAFF" },
                ],
              },
            ]}
            onSearch={handleSearch}
            isLoading={loading}
            backgroundColor="bg-gray-100"
          />
        )}

        <Card>
          <CardContent className="p-0">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    {u.roles.map((r: string) => (
                      <Badge
                        key={r}
                        variant={ROLE_COLORS[r] as "default" | "secondary" | "destructive" | "outline"}
                        className="mr-1"
                      >
                        {r}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell>{u.branchName}</TableCell>
                  <TableCell className="text-right">
                    {(role === "SUPERADMIN" || role === "ADMIN") && u.roles.includes("MANAGER") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUserForPin(u);
                          setShowPinDialog(true);
                        }}
                        className="gap-2"
                      >
                        <Lock className="h-4 w-4" />
                        PIN
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{loading ? "Loading users..." : "No users found"}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {totalElements > 0
              ? `Showing ${currentPage * pageSize + 1} to ${Math.min((currentPage + 1) * pageSize, totalElements)} of ${totalElements} users`
              : `Showing 0 of ${totalElements} users`}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Rows per page:</Label>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(0); }} disabled={loading}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={loading || currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage + 1} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={loading || currentPage >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

        <CreateUserDialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) fetchUsers(); }} />

        {selectedUserForPin && (
          <PinManagementDialog
            userId={selectedUserForPin.id}
            userName={selectedUserForPin.full_name}
            open={showPinDialog}
            onOpenChange={setShowPinDialog}
            onSuccess={() => fetchUsers()}
          />
        )}
      </div>
    </>
  );
}
