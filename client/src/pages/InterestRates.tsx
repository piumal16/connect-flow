import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Plus, Power, Star } from "lucide-react";
import apiClient from "@/integrations/api";

type InterestRate = {
  id: string;
  name: string;
  ratePercent: number;
  firstMonthRatePercent?: number;
  isActive: boolean;
  isDefault: boolean;
};

export default function InterestRates() {
  const [rates, setRates] = useState<InterestRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState("");
  const [ratePercent, setRatePercent] = useState("");
  const [firstMonthRatePercent, setFirstMonthRatePercent] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [targetDeactivateRate, setTargetDeactivateRate] = useState<InterestRate | null>(null);
  const [replacementDefaultRateId, setReplacementDefaultRateId] = useState("");

  const { toast } = useToast();

  const activeRates = useMemo(() => rates.filter((r) => r.isActive), [rates]);
  const replacementCandidates = useMemo(
    () => activeRates.filter((r) => r.id !== targetDeactivateRate?.id),
    [activeRates, targetDeactivateRate]
  );

  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.interestRates.getAll();
      setRates(data);
    } catch (error: unknown) {
      console.error("Failed to fetch interest rates:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch interest rates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchRates();
  }, [fetchRates]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !ratePercent) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const shouldBeDefault = activeRates.length === 0 ? true : isDefault;
      await apiClient.interestRates.create({
        name,
        ratePercent: parseFloat(ratePercent),
        firstMonthRatePercent: firstMonthRatePercent ? parseFloat(firstMonthRatePercent) : undefined,
        isActive: true,
        isDefault: shouldBeDefault,
      });

      toast({
        title: "Success",
        description: shouldBeDefault
          ? "Interest rate created as default"
          : "Interest rate created successfully",
      });

      setShowDialog(false);
      setName("");
      setRatePercent("");
      setFirstMonthRatePercent("");
      setIsDefault(false);
      await fetchRates();
    } catch (error: unknown) {
      console.error("Error creating interest rate:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create interest rate",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (rate: InterestRate) => {
    setLoading(true);
    try {
      if (rate.isActive && rate.isDefault) {
        if (replacementCandidates.length === 0) {
          toast({
            title: "Cannot Deactivate",
            description: "Create or activate another rate before deactivating the current default rate.",
            variant: "destructive",
          });
          return;
        }

        setTargetDeactivateRate(rate);
        setReplacementDefaultRateId("");
        setShowReplaceDialog(true);
        return;
      }

      await apiClient.interestRates.toggleActive(rate.id);
      toast({
        title: "Success",
        description: `Interest rate ${rate.isActive ? "deactivated" : "activated"} successfully`,
      });
      await fetchRates();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update interest rate status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setAsDefault = async (rate: InterestRate) => {
    if (!rate.isActive) {
      toast({
        title: "Cannot Set Default",
        description: "Only active rates can be set as default",
        variant: "destructive",
      });
      return;
    }

    if (rate.isDefault) {
      toast({
        title: "Already Default",
        description: "This rate is already set as default",
      });
      return;
    }

    try {
      setLoading(true);
      await apiClient.interestRates.update(rate.id, {
        name: rate.name,
        ratePercent: rate.ratePercent,
        firstMonthRatePercent: rate.firstMonthRatePercent,
        isActive: rate.isActive,
        isDefault: true,
      });

      toast({
        title: "Success",
        description: `${rate.name} is now the default rate`,
      });
      await fetchRates();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to set default rate",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmDeactivateDefault = async () => {
    if (!targetDeactivateRate || !replacementDefaultRateId) {
      toast({
        title: "Validation Error",
        description: "Please select another active rate as default",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await apiClient.interestRates.toggleActive(targetDeactivateRate.id, replacementDefaultRateId);
      toast({
        title: "Success",
        description: "Default rate changed and previous default deactivated successfully",
      });
      setShowReplaceDialog(false);
      setTargetDeactivateRate(null);
      setReplacementDefaultRateId("");
      await fetchRates();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deactivate default rate",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <LoadingOverlay isLoading={loading} message="Loading interest rates..." />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Interest Rate Management</h1>
        <Button onClick={() => setShowDialog(true)} disabled={loading}><Plus className="mr-2 h-4 w-4" /> Add Rate</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Rate %</TableHead>
                <TableHead>First Month %</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.ratePercent}%</TableCell>
                  <TableCell>{(r.firstMonthRatePercent ?? r.ratePercent / 12).toFixed(2)}%</TableCell>
                  <TableCell>
                    {r.isDefault && r.isActive ? <Badge>Default</Badge> : <Badge variant="outline">No</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.isActive ? "default" : "secondary"}>{r.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(r)}
                        disabled={loading}
                        title={r.isActive ? "Deactivate" : "Activate"}
                      >
                        <Power className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAsDefault(r)}
                        disabled={loading || !r.isActive || r.isDefault}
                        title="Set as default"
                      >
                        <Star className={`h-3 w-3 ${r.isDefault ? "fill-yellow-500 text-yellow-500" : ""}`} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {loading ? "Loading interest rates..." : "No interest rates found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Interest Rate</DialogTitle>
            <DialogDescription>
              {activeRates.length === 0
                ? "This will be set as default automatically because this is the first active rate."
                : "Choose whether this new rate should become the default active rate."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <Label>Rate Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Standard Rate" disabled={loading} />
            </div>
            <div>
              <Label>Rate (%)</Label>
              <Input type="number" step="0.01" value={ratePercent} onChange={(e) => setRatePercent(e.target.value)} required disabled={loading} />
            </div>
            <div>
              <Label>First Month Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={firstMonthRatePercent}
                onChange={(e) => setFirstMonthRatePercent(e.target.value)}
                placeholder="Defaults to Rate / 12"
                disabled={loading}
              />
            </div>

            {activeRates.length > 0 && (
              <div className="flex items-center space-x-2">
                <Checkbox id="set-default" checked={isDefault} onCheckedChange={(v) => setIsDefault(!!v)} disabled={loading} />
                <Label htmlFor="set-default">Set as default active rate</Label>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              Create Rate
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Replacement Default</DialogTitle>
            <DialogDescription>
              You are deactivating the current default rate. Select another active rate as the new default.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>New Default Rate</Label>
              <Select value={replacementDefaultRateId} onValueChange={setReplacementDefaultRateId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select replacement default rate" />
                </SelectTrigger>
                <SelectContent>
                  {replacementCandidates.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} - {r.ratePercent}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReplaceDialog(false);
                  setTargetDeactivateRate(null);
                  setReplacementDefaultRateId("");
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={confirmDeactivateDefault} disabled={loading}>Confirm</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
