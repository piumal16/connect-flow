import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import apiClient from "@/integrations/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Plus, Edit, Power, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  is_active: boolean;
  manager_id?: string | null;
}

interface BranchApiResponse extends Partial<Branch> {
  isActive?: boolean;
  is_active?: boolean;
  managerId?: string | null;
  manager_id?: string | null;
}

interface ManagerOption {
  id: string;
  full_name: string;
}

export default function Branches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [managerId, setManagerId] = useState("");
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const sortBy = "name";
  const sortDir = "asc";
  const { toast } = useToast();
  const { role } = useAuth();

  const fetchBranches = useCallback(async () => {
    try {
      const response = await apiClient.branches.getPaginated(currentPage, pageSize, sortBy, sortDir);
      const normalized: Branch[] = response.content.map((b: BranchApiResponse) => ({
        ...b,
        id: b.id || "",
        name: b.name || "",
        address: b.address || "",
        phone: b.phone || "",
        is_active: b.isActive ?? b.is_active ?? false,
        manager_id: b.managerId ?? b.manager_id,
      }));
      setBranches(normalized);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load branches",
        variant: "destructive",
      });
    }
  }, [currentPage, pageSize, sortBy, sortDir, toast]);

  const fetchManagers = useCallback(async () => {
    try {
      const data = await apiClient.users.getByRole("MANAGER");
      const normalized: ManagerOption[] = data.map((u: { id: string; fullName: string }) => ({
        id: u.id,
        full_name: u.fullName,
      }));
      setManagers(normalized);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load managers",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    const loadPageData = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchBranches(), fetchManagers()]);
      } finally {
        setLoading(false);
      }
    };

    void loadPageData();
  }, [fetchBranches, fetchManagers]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const manager = managerId === "none" || managerId === "" ? null : managerId;
      if (editing) {
        await apiClient.branches.update(editing.id, { name, address, phone, managerId: manager, isActive: editing.is_active });
        toast({ title: "Branch updated" });
      } else {
        await apiClient.branches.create({ name, address, phone, managerId: manager, isActive: true });
        toast({ title: "Branch created" });
      }
      setShowDialog(false);
      setEditing(null);
      setName(""); setAddress(""); setPhone(""); setManagerId("");
      await fetchBranches();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save branch",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (branch: Branch) => {
    try {
      setLoading(true);
      await apiClient.branches.update(branch.id, { isActive: !branch.is_active });
      await fetchBranches();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update branch status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (branch: Branch) => {
    setEditing(branch);
    setName(branch.name);
    setAddress(branch.address || "");
    setPhone(branch.phone || "");
    setManagerId(branch.manager_id || "");
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">
      <LoadingOverlay isLoading={loading} message="Loading branches..." />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Branch Management</h1>
        {(role === "SUPERADMIN" || role === "ADMIN") && (
          <Button disabled={loading} onClick={() => { setEditing(null); setName(""); setAddress(""); setPhone(""); setManagerId(""); setShowDialog(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Branch
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.address}</TableCell>
                  <TableCell>{b.phone}</TableCell>
                  <TableCell>
                    <Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(b)} disabled={loading}><Edit className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(b)} disabled={loading}><Power className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {branches.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{loading ? "Loading branches..." : "No branches found"}</TableCell></TableRow>
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
              ? `Showing ${currentPage * pageSize + 1} to ${Math.min((currentPage + 1) * pageSize, totalElements)} of ${totalElements} branches`
              : `Showing 0 of ${totalElements} branches`}
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Branch" : "Create Branch"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Branch Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} disabled={loading} /></div>
            <div><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} disabled={loading} /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} /></div>
            <div>
              <Label>Assign Manager</Label>
              <Select value={managerId} onValueChange={setManagerId} disabled={loading}>
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={loading}>{editing ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
