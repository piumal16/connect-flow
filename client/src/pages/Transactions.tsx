import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import apiClient from "@/integrations/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Edit, X, Camera, Image as ImageIcon, ChevronLeft, ChevronRight, Info, DollarSign, TrendingUp, Filter } from "lucide-react";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { AdvancedSearchPanel, type FilterValue } from "@/components/ui/AdvancedSearchPanel";
import { compressImageDataUri, compressImageFile } from "@/utils/imageUtils";

export default function Transactions() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [filterPawnId, setFilterPawnId] = useState("");
  const [filterNic, setFilterNic] = useState("");
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterMaxAmount, setFilterMaxAmount] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [appliedFilters, setAppliedFilters] = useState({
    pawnId: "",
    customerNic: "",
    minAmount: "",
    maxAmount: "",
    status: "all",
  });
  const [rates, setRates] = useState<any[]>([]);
  const [outstandingBalances, setOutstandingBalances] = useState<{ [key: string]: any }>({});

  // Item Types state
  const [itemTypes, setItemTypes] = useState<any[]>([]);
  const [selectedItemTypeId, setSelectedItemTypeId] = useState("");

  // Category filter state (default to "A" only)
  const [categoryFilter, setCategoryFilter] = useState<"A" | "ALL">("A");
  const [patternUnlocked, setPatternUnlocked] = useState(false);
  const [patternBuffer, setPatternBuffer] = useState("");
  const [lastKeyTime, setLastKeyTime] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const { toast } = useToast();
  const { role } = useAuth();
  const navigate = useNavigate();

  // Mock branchId - in real app this would come from user context
  const branchId = "mock-branch-id";

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerNic, setCustomerNic] = useState("");
  const [idType, setIdType] = useState("NIC");
  const [gender, setGender] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemContent, setItemContent] = useState("");
  const [itemCondition, setItemCondition] = useState("Good");
  const [itemWeight, setItemWeight] = useState("");
  const [itemKarat, setItemKarat] = useState("24");
  const [appraisedValue, setAppraisedValue] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [selectedRateId, setSelectedRateId] = useState("");
  const [periodMonths, setPeriodMonths] = useState("12");
  const [remarks, setRemarks] = useState("");
   const [loading, setLoading] = useState(false);
   const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Redemption state
  const [showRedemptionDialog, setShowRedemptionDialog] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [outstandingBalance, setOutstandingBalance] = useState<any>(null);
  const [redemptionAmount, setRedemptionAmount] = useState("");
  const [redemptionNotes, setRedemptionNotes] = useState("");
  const [documentationAmount, setDocumentationAmount] = useState("0");
  const [redemptionLoading, setRedemptionLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const fetchTransactions = async () => {
    try {
      const minAmount = appliedFilters.minAmount.trim() !== ""
        ? Number(appliedFilters.minAmount)
        : undefined;
      const maxAmount = appliedFilters.maxAmount.trim() !== ""
        ? Number(appliedFilters.maxAmount)
        : undefined;

      const response = await apiClient.pawnTransactions.searchAdvanced({
        pawnId: appliedFilters.pawnId.trim() || undefined,
        customerNic: appliedFilters.customerNic.trim() || undefined,
        status: appliedFilters.status !== "all" ? appliedFilters.status : undefined,
        minAmount: Number.isFinite(minAmount) ? minAmount : undefined,
        maxAmount: Number.isFinite(maxAmount) ? maxAmount : undefined,
        patternMode: categoryFilter === "A" ? "A" : undefined, // Filter by pattern mode
        page: currentPage,
        size: pageSize,
        sortBy: "pawnDate",
        sortDir: "desc",
      });
      console.log("Fetched transactions:", response);
      setTransactions(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);

      // Fetch outstanding balances (including accrued interest) for all active transactions
      const activeTransactions = response.content?.filter((t: any) => t.status === "Active") || [];
      if (activeTransactions.length > 0) {
        const balances: { [key: string]: any } = {};
        for (const transaction of activeTransactions) {
          try {
            const balance = await apiClient.pawnRedemptions.getOutstandingBalance(transaction.id);
            balances[transaction.id] = balance;
          } catch (error) {
            console.error(`Failed to fetch balance for transaction ${transaction.id}:`, error);
            // Fallback to DB remaining balance
            balances[transaction.id] = {
              total: transaction.remainingBalance || transaction.loanAmount,
              principal: transaction.remainingBalance || transaction.loanAmount,
              accrualInterest: 0,
              charges: 0,
            };
          }
        }
        setOutstandingBalances(balances);
      }
    } catch (error: any) {
      console.error("Failed to fetch transactions:", error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    }
  };

  const fetchRates = async () => {
    try {
      const data = await apiClient.interestRates.getActive();
      console.log("Fetched rates:", data);
      setRates(data || []);
    } catch (error: any) {
      console.error("Failed to fetch rates:", error);
    }
  };

  const fetchItemTypes = async () => {
    try {
      const data = await apiClient.itemTypes.getAll();
      console.log("Fetched item types:", data);
      setItemTypes(data || []);
    } catch (error: any) {
      console.error("Failed to fetch item types:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchTransactions();
      } catch (error) {
        console.error("Error loading transactions:", error);
      }

      try {
        await fetchRates();
      } catch (error) {
        console.error("Error loading rates:", error);
      }

      try {
        await fetchItemTypes();
      } catch (error) {
        console.error("Error loading item types:", error);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, appliedFilters, categoryFilter]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // TND Pattern detection for unlocking category B
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        return;
      }

      const currentTime = Date.now();
      const key = e.key.toUpperCase();

      // If more than 2 seconds since last key, reset buffer
      if (currentTime - lastKeyTime > 2000) {
        setPatternBuffer(key);
      } else {
        setPatternBuffer((prev) => prev + key);
      }
      setLastKeyTime(currentTime);

      // Check if buffer matches TND pattern
      const newBuffer = currentTime - lastKeyTime > 2000 ? key : patternBuffer + key;
      if (newBuffer.length >= 3) {
        const lastThree = newBuffer.slice(-3);
        if (lastThree === "TND" && !patternUnlocked) {
          setPatternUnlocked(true);
          setCategoryFilter("ALL");
          setPatternBuffer("");
          toast({
            title: "🔓 All Categories Unlocked",
            description: "Search will now include both A and B categories",
          });
          // Refresh transactions with new filter
          fetchTransactions();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [lastKeyTime, patternBuffer, patternUnlocked, toast]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!customerName || !customerNic || !customerAddress || !selectedItemTypeId || !loanAmount || !selectedRateId || !periodMonths) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Get the interest rate percent from selected rate
      const selectedRate = rates.find(r => r.id === selectedRateId);
      if (!selectedRate) {
        toast({
          title: "Error",
          description: "Please select a valid interest rate",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Get the selected item type
      const selectedItemType = itemTypes.find(t => t.id === selectedItemTypeId);
      if (!selectedItemType) {
        toast({
          title: "Error",
          description: "Please select a valid item type",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Combine item type name with custom description
      const fullItemDescription = selectedItemType.name + (itemDescription.trim() ? ` - ${itemDescription.trim()}` : "");

      // Calculate dates
      const today = new Date();
      const pawnDate = today.toISOString().split('T')[0]; // Today's date

      // Calculate maturity date (today + period months)
      const maturityDate = new Date(today);
      maturityDate.setMonth(maturityDate.getMonth() + parseInt(periodMonths));
      const maturityDateStr = maturityDate.toISOString().split('T')[0];

      // Prepare transaction data — images are embedded in the items array.
      // Backend uploads Base64 images to Cloudinary during transaction creation.
      const transactionData = {
        customerName,
        customerNic,
        idType,
        gender,
        customerAddress,
        customerPhone,
        customerType: "Regular",
        patternMode: categoryFilter,
        loanAmount: parseFloat(loanAmount),
        interestRateId: selectedRateId,
        interestRatePercent: selectedRate.rate_percent || selectedRate.ratePercent,
        periodMonths: parseInt(periodMonths),
        pawnDate,
        maturityDate: maturityDateStr,
        remarks,
        items: [
          {
            description: fullItemDescription,
            content: itemContent,
            condition: itemCondition,
            weightGrams: itemWeight ? parseFloat(itemWeight) : 0,
            karat: itemKarat,
            appraisedValue: appraisedValue ? parseFloat(appraisedValue) : 0,
            images: imagePreviews, // Base64 data URIs — backend uploads to Cloudinary
          },
        ],
      };

      // Call API to create transaction
      const response = await apiClient.pawnTransactions.create(transactionData);

      toast({
        title: "Success",
        description: `Transaction created successfully! Pawn ID: ${response.pawnId || response.pawn_id}`,
      });

      // Reset form
      setCustomerName("");
      setCustomerNic("");
      setIdType("NIC");
      setGender("");
      setCustomerAddress("");
      setCustomerPhone("");
      setSelectedItemTypeId(""); // Reset item type
      setItemDescription(""); // Reset custom description
      setItemContent("");
      setItemCondition("Good");
      setItemWeight("");
      setItemKarat("24");
      setAppraisedValue("");
      setLoanAmount("");
      setSelectedRateId("");
      setPeriodMonths("6");
       setRemarks("");
        setImagePreviews([]);

      // Close dialog and refresh transactions
      setShowCreate(false);
      fetchTransactions();
    } catch (error: any) {
      console.error("Failed to create transaction:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create transaction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      compressImageFile(file, 1024, 0.8)
        .then((compressed) => {
          setImagePreviews((prev) => [...prev, compressed]);
          toast({
            title: "Image Added",
            description: `"${file.name}" compressed and added`,
          });
        })
        .catch(() => {
          toast({
            title: "Error",
            description: `Failed to process "${file.name}"`,
            variant: "destructive",
          });
        });
    }
    e.target.value = "";
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  const openCamera = useCallback(async () => {
    setCameraError(null);
    setShowCameraDialog(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error: unknown) {
      setCameraError(error instanceof Error ? error.message : "Camera access denied");
    }
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    compressImageDataUri(canvas.toDataURL("image/jpeg", 1.0), 1024, 0.8)
      .then((compressed) => {
        setImagePreviews((prev) => [...prev, compressed]);
        toast({
          title: "Photo Captured",
          description: "Photo compressed and added to transaction",
        });
        stopCamera();
        setShowCameraDialog(false);
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to process captured photo",
          variant: "destructive",
        });
      });
  }, [stopCamera, toast]);

  const removeImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenRedemption = async (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    setShowRedemptionDialog(true);
    await fetchOutstandingBalance(transactionId);
  };

  const fetchOutstandingBalance = async (transactionId: string) => {
    try {
      setBalanceLoading(true);
      const balance = await apiClient.pawnRedemptions.getOutstandingBalance(transactionId);
      setOutstandingBalance(balance);
      setRedemptionAmount("");
      setRedemptionNotes("");
      setDocumentationAmount("0");
    } catch (error: any) {
      console.error("Failed to fetch outstanding balance:", error);
      toast({
        title: "Error",
        description: "Failed to load outstanding balance",
        variant: "destructive",
      });
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleRedeemTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransactionId) return;

    if (!redemptionAmount || parseFloat(redemptionAmount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid redemption amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setRedemptionLoading(true);
      const redemptionData = {
        redemptionAmount: parseFloat(redemptionAmount),
        notes: redemptionNotes,
      };

      const result = await apiClient.pawnRedemptions.processRedemption(selectedTransactionId, redemptionData);

      // Show detailed success message based on redemption type
      if (result.isFullRedemption) {
        toast({
          title: "✓ Full Redemption Completed!",
          description: `Transaction marked as CLOSED. Gold will be released.\n\nPayment Breakdown:\n• Interest: Rs. ${result.interestPaid?.toLocaleString() || 0}\n• Charges: Rs. ${result.chargesPaid?.toLocaleString() || 0}\n• Principal: Rs. ${result.principalPaid?.toLocaleString() || 0}`,
        });
      } else {
        toast({
          title: "✓ Partial Payment Recorded!",
          description: `Total Paid: Rs. ${parseFloat(redemptionAmount).toLocaleString()}\n\nPayment Breakdown:\n• Interest: Rs. ${result.interestPaid?.toLocaleString() || 0}\n• Charges: Rs. ${result.chargesPaid?.toLocaleString() || 0}\n• Principal: Rs. ${result.principalPaid?.toLocaleString() || 0}\n\nRemaining Principal: Rs. ${result.remainingPrincipal?.toLocaleString() || 0}`,
        });
      }

      // Close dialog
      setShowRedemptionDialog(false);
      setSelectedTransactionId(null);
      setRedemptionAmount("");
      setRedemptionNotes("");
      setOutstandingBalance(null);

      // Refresh transactions - remainingBalance will be updated from DB
      await fetchTransactions();
    } catch (error: any) {
      console.error("Failed to process redemption:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process redemption",
        variant: "destructive",
      });
    } finally {
      setRedemptionLoading(false);
    }
  };

  const handleSearch = (filters: Record<string, FilterValue>) => {
    const pawnId = typeof filters.pawnId === 'string' ? filters.pawnId : undefined;
    const customerNic = typeof filters.customerNic === 'string' ? filters.customerNic : undefined;
    const minAmount = typeof filters.minAmount === 'string' ? filters.minAmount : undefined;
    const maxAmount = typeof filters.maxAmount === 'string' ? filters.maxAmount : undefined;

    // Handle status - can be array or string
    let status = "all";
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        // If multiple statuses selected, keep first one or "all"
        if (filters.status.length === 1) {
          status = filters.status[0];
        }
      } else if (typeof filters.status === 'string') {
        status = filters.status;
      }
    }

    setFilterPawnId(pawnId || "");
    setFilterNic(customerNic || "");
    setFilterMinAmount(minAmount || "");
    setFilterMaxAmount(maxAmount || "");
    setStatusFilter(status);

    setAppliedFilters({
      pawnId: pawnId || "",
      customerNic: customerNic || "",
      minAmount: minAmount || "",
      maxAmount: maxAmount || "",
      status: status,
    });

    setCurrentPage(0);
  };

  const hasActiveFilters = filterPawnId || filterNic || filterMinAmount || filterMaxAmount || statusFilter !== "all";

  const fixedCharges = 50;
  const documentationValue = Number(documentationAmount) || 0;
  const effectiveCharges = fixedCharges + documentationValue;
  const computedOutstandingTotal =
    (Number(outstandingBalance?.principal) || 0) +
    (Number(outstandingBalance?.accrualInterest) || 0) +
    effectiveCharges;

  return (
    <div className="space-y-6">
      <LoadingOverlay isLoading={loading} message="Loading transactions..." />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pawn Transactions</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            disabled={loading}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 bg-slate-600 text-white">
                {[filterPawnId, filterNic, filterMinAmount, filterMaxAmount, statusFilter !== "all" ? statusFilter : ""].filter(Boolean).length}
              </Badge>
            )}
          </Button>
          {(role !== "STAFF" || role === "STAFF") && branchId && (
            <Button onClick={() => navigate("/transactions/create")} variant="default">
              <Plus className="mr-2 h-4 w-4" /> Create Pawning
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Search Panel */}
      {showFilters && (
        <AdvancedSearchPanel
          title="Transaction Search"
          subtitle="Search pawn transactions by Pawn ID, NIC, amount, or status"
          inputFields={[
            {
              name: "pawnId",
              label: "Pawn ID",
              placeholder: "Enter Pawn ID",
            },
            {
              name: "customerNic",
              label: "Customer NIC",
              placeholder: "Enter NIC number",
            },
            {
              name: "minAmount",
              label: "Min Amount",
              placeholder: "Min loan amount",
              type: "number",
            },
            {
              name: "maxAmount",
              label: "Max Amount",
              placeholder: "Max loan amount",
              type: "number",
            },
          ]}
          checkboxGroups={[
            {
              name: "status",
              label: "Status",
              options: [
                { label: "Active", value: "Active" },
                { label: "Overdue", value: "Overdue" },
                { label: "Completed", value: "Completed" },
                { label: "Defaulted", value: "Defaulted" },
                { label: "Blocked", value: "Blocked" },
              ],
              defaultChecked: true,
            },
          ]}
          onSearch={handleSearch}
          isLoading={loading}
          backgroundColor="bg-muted/40"
        />
      )}

      <Card>
        <CardContent className="space-y-4 p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pawn ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>NIC</TableHead>
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>Remaining Balance</TableHead>
                  <TableHead>Rate %</TableHead>
                  <TableHead>Maturity</TableHead>
                  <TableHead>Status</TableHead>
                  {(role === "MANAGER" || role === "SUPERADMIN" || role === "ADMIN" || role === "STAFF") && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono font-medium">{t.pawnId || t.pawn_id}</TableCell>
                    <TableCell>{t.customerName || t.customer_name}</TableCell>
                    <TableCell>{t.customerNic || t.customer_nic}</TableCell>
                    <TableCell>Rs. {Number(t.loanAmount || t.loan_amount).toLocaleString()}</TableCell>
                    <TableCell>
                      {t.status === "Active" && outstandingBalances[t.id] ? (
                        <span className="text-orange-600 font-semibold">
                          Rs. {outstandingBalances[t.id].total?.toLocaleString() || 0}
                        </span>
                      ) : t.status === "Active" && t.remainingBalance ? (
                        <span className="text-orange-600 font-semibold">Rs. {Number(t.remainingBalance).toLocaleString()}</span>
                      ) : t.status === "Completed" ? (
                        <span className="text-green-600 font-semibold">Settled</span>
                      ) : t.status === "Profited" ? (
                        <span className="text-purple-600 font-semibold">Profited</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{t.interestRatePercent || t.interest_rate_percent}%</TableCell>
                    <TableCell>{t.maturityDate || t.maturity_date}</TableCell>
                    <TableCell>
                      {(() => {
                        const maturityDate = t.maturityDate || t.maturity_date;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const maturity = maturityDate ? new Date(maturityDate) : null;
                        if (maturity) maturity.setHours(0, 0, 0, 0);

                        // Check if overdue (Active status but past maturity)
                        const isOverdue = t.status === "Active" && maturity && maturity < today;

                        if (isOverdue || t.status === "Overdue") {
                          return <Badge variant="destructive">Overdue</Badge>;
                        }

                        return (
                          <Badge variant={
                            t.status === "Active" ? "default" :
                            t.status === "Completed" ? "secondary" :
                            t.status === "Profited" ? "outline" :
                            "destructive"
                          } className={t.status === "Profited" ? "border-purple-500 text-purple-600 bg-purple-50" : ""}>
                            {t.status}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    {(role === "MANAGER" || role === "SUPERADMIN" || role === "ADMIN" || role === "STAFF") && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/transactions/info/${t.id}`)}
                            disabled={loading}
                          >
                            <Info className="h-4 w-4 mr-1" />
                            Info
                          </Button>
                          {t.status !== "Completed" && t.status !== "Blocked" && t.status !== "Profited" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/transactions/edit/${t.id}`)}
                              disabled={loading}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          )}
                          {t.status === "Active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/transactions/redeem/${t.id}`)}
                              disabled={loading}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Redeem
                            </Button>
                          )}
                          {t.status === "Active" && (role === "ADMIN" || role === "SUPERADMIN" || role === "MANAGER") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/transactions/profit/${t.id}`)}
                              disabled={loading}
                            >
                              <TrendingUp className="h-4 w-4 mr-1" />
                              Profit
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No transactions found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Rows per page:</Label>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(0);
                  }}
                >
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
              <div className="text-sm text-muted-foreground">
                Showing {transactions.length > 0 ? currentPage * pageSize + 1 : 0} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} transactions
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm px-2">
                Page {totalElements > 0 ? currentPage + 1 : 0} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage >= totalPages - 1 || totalPages === 0}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          setShowCreate(open);
          if (!open) {
            stopCamera();
            setShowCameraDialog(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Pawn Transaction</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Customer Name</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required /></div>
              <div><Label>NIC</Label><Input value={customerNic} onChange={(e) => setCustomerNic(e.target.value)} required /></div>
              <div><Label>Address</Label><Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} required /></div>
              <div><Label>Phone</Label><Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
            </div>
            <hr />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Item Type *</Label>
                <Select value={selectedItemTypeId} onValueChange={setSelectedItemTypeId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item type" />
                  </SelectTrigger>
                  <SelectContent>
                    {itemTypes.length > 0 ? (
                      itemTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                          {type.description && (
                            <span className="text-xs text-muted-foreground ml-2">
                              - {type.description}
                            </span>
                          )}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No item types available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Select the type of gold item being pawned
                </p>
              </div>
              <div>
                <Label>Additional Details (Optional)</Label>
                <Input
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="e.g., With stones, 18 inch length"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Add specific details about this item
                </p>
              </div>
              <div><Label>Weight (grams) *</Label><Input type="number" step="0.01" value={itemWeight} onChange={(e) => setItemWeight(e.target.value)} required /></div>
              <div><Label>Karat *</Label>
                <Select value={itemKarat} onValueChange={setItemKarat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[24,22,21,18,14].map((k) => <SelectItem key={k} value={String(k)}>{k}K</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Appraised Value *</Label><Input type="number" step="0.01" value={appraisedValue} onChange={(e) => setAppraisedValue(e.target.value)} required /></div>
            </div>
            <hr />
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Loan Amount</Label><Input type="number" step="0.01" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} required /></div>
              <div><Label>Interest Rate</Label>
                <Select value={selectedRateId} onValueChange={setSelectedRateId}>
                  <SelectTrigger><SelectValue placeholder="Select rate" /></SelectTrigger>
                  <SelectContent>
                    {rates.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} - {r.rate_percent}%</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Period (months)</Label>
                <Select value={periodMonths} onValueChange={setPeriodMonths}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[3,6,9,12,18,24].map((m) => <SelectItem key={m} value={String(m)}>{m} months</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Remarks</Label><Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} /></div>

            {/* Image Upload Section */}
            <div className="border-t pt-4">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Item Images (Optional)
              </Label>
              <p className="text-xs text-muted-foreground mb-3">Upload images of the gold item from different angles</p>

              <div className="flex gap-2 mb-3 items-center">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="h-4 w-4 mr-1" />Upload
                </Button>
                <Button type="button" variant="outline" onClick={openCamera}>
                  <Camera className="h-4 w-4 mr-1" />Camera
                </Button>
                <span className="text-xs text-muted-foreground py-2">{imagePreviews.length} image(s) selected</span>
              </div>

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating..." : "Create Transaction"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCameraDialog}
        onOpenChange={(open) => {
          if (!open) {
            stopCamera();
          }
          setShowCameraDialog(open);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4" /> Capture Photo
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {cameraError ? (
              <div className="w-full rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 text-center">
                <p className="font-semibold mb-1">Camera unavailable</p>
                <p>{cameraError}</p>
              </div>
            ) : (
              <div className="w-full rounded-lg overflow-hidden bg-black border">
                <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-72 object-cover" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                stopCamera();
                setShowCameraDialog(false);
              }}
            >
              Cancel
            </Button>
            {!cameraError && (
              <Button type="button" onClick={capturePhoto}>
                <Camera className="h-4 w-4 mr-1" />Capture
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Redemption Dialog */}
      <Dialog open={showRedemptionDialog} onOpenChange={setShowRedemptionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Process Gold Redemption</DialogTitle></DialogHeader>

          {balanceLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading balance details...</div>
          ) : outstandingBalance ? (
            <form onSubmit={handleRedeemTransaction} className="space-y-6">
              {/* Transaction Summary */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">Transaction Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Loan Amount</p>
                    <p className="font-semibold">Rs. {outstandingBalance.principal?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Interest Rate</p>
                    <p className="font-semibold">{outstandingBalance.ratePercent || "N/A"}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pawn Date (Created)</p>
                    <p className="font-semibold">{outstandingBalance.pawnDate || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Maturity Date</p>
                    <p className="font-semibold">{outstandingBalance.maturityDate || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-semibold">{outstandingBalance.loanStatus || "Active"}</p>
                  </div>
                </div>
              </div>

              {/* Outstanding Balance Breakdown */}
              <div className="bg-muted/40 p-4 rounded-lg border border-border">
                <h3 className="font-semibold text-foreground mb-3">Outstanding Balance Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Principal:</span>
                    <span className="font-medium">Rs. {outstandingBalance.principal?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accrued Interest:</span>
                    <span className="font-medium">Rs. {outstandingBalance.accrualInterest?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Charges:</span>
                    <span className="font-medium">Rs. {fixedCharges.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Documentation:</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={documentationAmount}
                      onChange={(e) => setDocumentationAmount(e.target.value)}
                      placeholder="0"
                      className="w-28 h-8 text-right"
                    />
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between text-base font-bold text-foreground">
                    <span>Total Outstanding:</span>
                    <span>Rs. {computedOutstandingTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Redemption Input */}
              <div className="space-y-4">
                <div>
                  <Label className="font-semibold">Redemption Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={redemptionAmount}
                    onChange={(e) => setRedemptionAmount(e.target.value)}
                    placeholder="Enter amount to pay"
                    required
                  />

                  {/* Payment Allocation Information */}
                  <div className="mt-2 p-3 bg-muted/40 rounded border border-border text-sm">
                    <p className="font-semibold text-foreground mb-1">Payment Allocation:</p>
                    <p className="text-foreground/80">Interest -&gt; Charges -&gt; Principal</p>
                    <p className="text-muted-foreground mt-1 text-xs">Interest is calculated weekly (Mon-Sun). Paying any day counts the full week.</p>
                  </div>

                  {redemptionAmount && computedOutstandingTotal && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      {parseFloat(redemptionAmount) === computedOutstandingTotal ? (
                        <p className="text-green-700 font-semibold">✓ Full Redemption (Complete Settlement)</p>
                      ) : parseFloat(redemptionAmount) < computedOutstandingTotal ? (
                        <p className="text-blue-700">
                          Partial Payment - Remaining Principal: Rs. {(Number(outstandingBalance.principal || 0) - (parseFloat(redemptionAmount) - Number(outstandingBalance.accrualInterest || 0) - effectiveCharges)).toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-red-700">⚠ Amount exceeds outstanding balance</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={redemptionNotes}
                    onChange={(e) => setRedemptionNotes(e.target.value)}
                    placeholder="Add any notes about this redemption"
                    rows={3}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={redemptionLoading || !redemptionAmount}>
                {redemptionLoading ? "Processing..." : "Confirm Redemption"}
              </Button>
            </form>
          ) : (
            <div className="py-8 text-center text-red-500">Failed to load balance details</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
