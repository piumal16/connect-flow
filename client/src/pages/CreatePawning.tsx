import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import apiClient from "@/integrations/api";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Image as ImageIcon, Upload, X, Plus, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CreatePawning() {
  const { toast } = useToast();
  const { role, user, branchId } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<any[]>([]);
  const [itemTypes, setItemTypes] = useState<any[]>([]);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Customer verification & details
  const [nicInput, setNicInput] = useState("");
  const [nicVerified, setNicVerified] = useState(false);
  const [nicVerifying, setNicVerifying] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blocklistReason, setBlocklistReason] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerNic, setCustomerNic] = useState("");
  const [idType, setIdType] = useState("NIC");
  const [gender, setGender] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Field-level validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 2: Item information
  const [itemDescription, setItemDescription] = useState("");
  const [itemContent, setItemContent] = useState("");
  const [itemCondition, setItemCondition] = useState("Good");
  const [itemWeight, setItemWeight] = useState("");
  const [itemKarat, setItemKarat] = useState("N/A");
  const [appraisedValue, setAppraisedValue] = useState("");
  const [marketValue, setMarketValue] = useState("");
  const [currentItemImages, setCurrentItemImages] = useState<string[]>([]);
  // Tracks how many image uploads are in-flight
  const [uploadingImageCount, setUploadingImageCount] = useState(0);

  interface ItemDetail {
    description: string;
    content: string;
    condition: string;
    weightGrams: number;
    karat: string;
    appraisedValue: number;
    marketValue: number;
    images: string[];
  }
  const [items, setItems] = useState<ItemDetail[]>([]);

  // Step 3: Transaction details
  const [loanAmount, setLoanAmount] = useState("");
  const [selectedRateId, setSelectedRateId] = useState("");
  const [periodMonths, setPeriodMonths] = useState("12");
  const [remarks, setRemarks] = useState("");
  const [manualRateEnabled, setManualRateEnabled] = useState(false);
  const [manualRatePercent, setManualRatePercent] = useState("");
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinVerifying, setPinVerifying] = useState(false);
  const [managerUserId, setManagerUserId] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Hidden feature: T-N-D key sequence for revealing period field
  const [showPeriodField, setShowPeriodField] = useState(false);
  const keySequenceRef = useRef<string[]>([]);
  const keyTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchRates();
    fetchItemTypes();
  }, []);

  const fetchRates = async () => {
    try {
      const data = await apiClient.interestRates.getActive();
      setRates(data || []);

      // Auto-select default rate if available
      if (data && data.length > 0) {
        const defaultRate = data.find((rate: any) => rate.isDefault);
        if (defaultRate) {
          setSelectedRateId(defaultRate.id);
        } else {
          // Fall back to first rate if no default is marked
          setSelectedRateId(data[0].id);
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch rates:", error);
      toast({
        title: "Error",
        description: "Failed to load interest rates",
        variant: "destructive",
      });
    }
  };

  const fetchItemTypes = async () => {
    console.log("🔄 Fetching item types from API...");
    try {
      const data = await apiClient.itemTypes.getAll();
      console.log("✅ Fetched item types:", data);
      console.log("📊 Number of item types:", data?.length || 0);
      setItemTypes(data || []);

      if (data && data.length > 0) {
        // toast({
        //   title: "Item Types Loaded",
        //   description: `${data.length} item types loaded from database`,
        // });
      }
    } catch (error: any) {
      console.error("❌ Failed to fetch item types:", error);
      console.error("Error details:", error.message);
      toast({
        title: "Warning",
        description: `Failed to load item types: ${error.message}. Using default options.`,
        variant: "destructive",
      });
    }
  };

  // Hidden feature: T-N-D key sequence to reveal period field
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['t', 'n', 'd'].includes(key)) {
        keySequenceRef.current.push(key);
        if (keyTimerRef.current) clearTimeout(keyTimerRef.current);

        if (keySequenceRef.current.length >= 3) {
          const lastThree = keySequenceRef.current.slice(-3).join('');
          if (lastThree === 'tnd') {
            setShowPeriodField(!showPeriodField);
            toast({
              title: showPeriodField ? "Period Field Hidden" : "Period Field Revealed",
              description: showPeriodField ? "Period field is now hidden" : "Type T-N-D again to hide",
            });
            keySequenceRef.current = [];
          }
        }

        keyTimerRef.current = setTimeout(() => {
          keySequenceRef.current = [];
        }, 3000);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (keyTimerRef.current) clearTimeout(keyTimerRef.current);
    };
  }, [showPeriodField, toast]);

  // Auto-fill loan amount from total appraised value
  useEffect(() => {
    const totalAppraisedValue = items.reduce((sum, item) => sum + item.appraisedValue, 0);
    if (items.length > 0) {
      setLoanAmount(totalAppraisedValue.toFixed(2));
    } else {
      setLoanAmount("");
    }
  }, [items]);

  // Step 1: Verify NIC
  const handleVerifyNic = async () => {
    if (!nicInput.trim()) {
      setErrors({ ...errors, nic: "Please enter NIC number" });
      return;
    }

    try {
      setNicVerifying(true);
      setErrors({});

      const response = await apiClient.blacklist.verifyNic(nicInput.trim());

      if (response.isBlocked) {
        setIsBlocked(true);
        setBlocklistReason(response.blocklistReason);
        setNicVerified(false);
        toast({
          title: "Customer Blocked",
          description: `This customer is blocked: ${response.blocklistReason}`,
          variant: "destructive",
        });
      } else {
        setIsBlocked(false);
        setBlocklistReason("");
        setNicVerified(true);
        setCustomerNic(nicInput.trim());

        // Auto-fill if customer exists
        if (response.customer) {
          setCustomerName(response.customer.fullName || "");
          setCustomerPhone(response.customer.phone || "");
          setCustomerAddress(response.customer.address || "");
          toast({
            title: "Customer Found",
            description: "Customer details have been auto-filled. You can edit them if needed.",
          });
        } else {
          // Clear fields for new customer
          setCustomerName("");
          setCustomerPhone("");
          setCustomerAddress("");
          toast({
            title: "NIC Verified",
            description: "No existing customer record. Please enter customer details.",
          });
        }
      }
    } catch (error: any) {
      console.error("Failed to verify NIC:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify NIC",
        variant: "destructive",
      });
    } finally {
      setNicVerifying(false);
    }
  };

  // Step 1 validation and navigation
  const handleStep1Next = () => {
    const newErrors: Record<string, string> = {};

    if (!nicVerified) {
      newErrors.nic = "Please verify NIC first";
    }
    if (!customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }
    if (!gender) {
      newErrors.gender = "Gender is required";
    }
    if (!customerAddress.trim()) {
      newErrors.customerAddress = "Address is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setErrors({});
    setCurrentStep(2);
  };

  // Step 2: Add item
  const handleAddItem = () => {
    if (uploadingImageCount > 0) {
      toast({
        title: "Please Wait",
        description: "Images are still uploading. Please wait before adding the item.",
        variant: "destructive",
      });
      return;
    }

    const newErrors: Record<string, string> = {};

    if (!itemWeight || parseFloat(itemWeight) <= 0) {
      newErrors.itemWeight = "Weight is required and must be greater than 0";
    }
    if (!appraisedValue || parseFloat(appraisedValue) <= 0) {
      newErrors.appraisedValue = "Appraised value is required and must be greater than 0";
    }
    if (!marketValue || parseFloat(marketValue) <= 0) {
      newErrors.marketValue = "Market value is required and must be greater than 0";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const newItem: ItemDetail = {
      description: itemDescription || "Item",
      content: itemContent,
      condition: itemCondition,
      weightGrams: parseFloat(itemWeight),
      karat: itemKarat,
      appraisedValue: parseFloat(appraisedValue),
      marketValue: parseFloat(marketValue),
      images: currentItemImages,
    };

    setItems([...items, newItem]);

    // Reset item form
    setItemDescription("");
    setItemContent("");
    setItemCondition("Good");
    setItemWeight("");
    setItemKarat("N/A");
    setAppraisedValue("");
    setMarketValue("");
    setCurrentItemImages([]);
    setUploadingImageCount(0);
    setErrors({});

    toast({
      title: "Item Added",
      description: "Item added successfully",
    });
  };

  // Step 2 validation and navigation
  const handleStep2Next = () => {
    if (items.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one item",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep(3);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Reset input so the same file can be re-selected after removal
    e.target.value = "";

    setUploadingImageCount((prev) => prev + files.length);

    for (const file of files) {
      try {
        const result = await apiClient.images.upload(file, "pending");
        if (result.success && result.url) {
          setCurrentItemImages((prev) => [...prev, result.url]);
        }
      } catch (error: any) {
        console.error("Image upload failed:", error);
        toast({
          title: "Image Upload Failed",
          description: `Could not upload "${file.name}": ${error.message}`,
          variant: "destructive",
        });
      } finally {
        setUploadingImageCount((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const removeImage = (index: number) => {
    setCurrentItemImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Manual rate toggle
  const resolveManagerUserId = async () => {
    if (role === "MANAGER" && user?.id) return user.id;

    const staffBranchId = user?.branchId || branchId || null;
    if (!staffBranchId) {
      toast({
        title: "Error",
        description: "Branch ID not found for this staff user",
        variant: "destructive",
      });
      return null;
    }

    try {
      const users = await apiClient.users.getByBranch(staffBranchId);
      const manager = Array.isArray(users)
        ? users.find((u) => String(u.role).toUpperCase() === "MANAGER")
        : null;
      if (!manager?.id) {
        toast({
          title: "Error",
          description: "No branch manager found for this branch",
          variant: "destructive",
        });
        return null;
      }
      return manager.id as string;
    } catch (error: any) {
      console.error("Failed to resolve branch manager:", error);
      toast({
        title: "Error",
        description: "Failed to find branch manager",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleManualRateToggle = async () => {
    if (manualRateEnabled) {
      setManualRateEnabled(false);
      setManualRatePercent("");
      return;
    }

    if (role !== "MANAGER" && role !== "STAFF") {
      toast({
        title: "Not Allowed",
        description: "Only branch managers or staff can enable manual rates",
        variant: "destructive",
      });
      return;
    }

    const resolvedManagerId = await resolveManagerUserId();
    if (!resolvedManagerId) return;
    setManagerUserId(resolvedManagerId);
    setPinInput("");
    setShowPinDialog(true);
  };

  const handleVerifyPin = async () => {
    if (!managerUserId || !pinInput.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter manager PIN",
        variant: "destructive",
      });
      return;
    }

    try {
      setPinVerifying(true);
      await apiClient.users.verifyPin(managerUserId, pinInput.trim());
      setManualRateEnabled(true);
      setShowPinDialog(false);
      toast({
        title: "Success",
        description: "Manual rate enabled",
      });
    } catch (error: any) {
      console.error("PIN verification failed:", error);
      toast({
        title: "Invalid PIN",
        description: "Branch manager PIN is incorrect",
        variant: "destructive",
      });
    } finally {
      setPinVerifying(false);
    }
  };

  // Step 3: Create transaction
  const handleStep3Submit = () => {
    const newErrors: Record<string, string> = {};

    if (!manualRateEnabled && !selectedRateId) {
      newErrors.interestRate = "Please select an interest rate";
    }
    if (manualRateEnabled && !manualRatePercent) {
      newErrors.manualRate = "Please enter the manual interest rate";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setErrors({});
    setShowSummary(true);
  };

  const selectedRate = rates.find((r) => r.id === selectedRateId);
  const effectiveRatePercent = manualRateEnabled
    ? parseFloat(manualRatePercent || "0")
    : (selectedRate?.rate_percent || selectedRate?.ratePercent || 0);
  const firstMonthRatePercent = manualRateEnabled
    ? effectiveRatePercent / 12
    : (selectedRate?.firstMonthRatePercent || effectiveRatePercent / 12);

  const handleConfirmSubmit = async () => {
    try {
      setLoading(true);

      const today = new Date();
      const pawnDate = today.toISOString().split('T')[0];
      const maturityDate = new Date(today);
      maturityDate.setMonth(maturityDate.getMonth() + parseInt(periodMonths));
      const maturityDateStr = maturityDate.toISOString().split('T')[0];

      const totalWeight = items.reduce((sum, item) => sum + item.weightGrams, 0);
      const totalAppraisedValue = items.reduce((sum, item) => sum + item.appraisedValue, 0);
      const allImages = items.flatMap(item => item.images);

      const itemDescription = items.length > 1
        ? `Multiple items (${items.length} items)`
        : (items[0]?.description || "");

      const transactionData = {
        customerName,
        customerNic,
        idType,
        gender,
        customerAddress,
        customerPhone,
        customerType: "Regular",
        itemDescription,
        itemContent: items[0]?.content || "",
        itemCondition: items[0]?.condition || "Good",
        itemWeightGrams: totalWeight,
        itemKarat: items[0]?.karat || "N/A",
        appraisedValue: totalAppraisedValue,
        loanAmount: parseFloat(loanAmount),
        interestRateId: manualRateEnabled ? null : selectedRateId,
        interestRatePercent: effectiveRatePercent,
        firstMonthInterestRatePercent: firstMonthRatePercent,
        periodMonths: parseInt(periodMonths),
        pawnDate,
        maturityDate: maturityDateStr,
        remarks,
        imageUrls: allImages,
        items: items.map(item => ({
          ...item,
          karat: item.karat,
        })),
      };

      const response = await apiClient.pawnTransactions.create(transactionData);

      toast({
        title: "Success",
        description: `Pawning transaction created successfully! Pawn ID: ${response.pawnId || response.pawn_id}`,
      });

      setShowSummary(false);
      navigate("/transactions");
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

  const handleReset = () => {
    setCurrentStep(1);
    setNicInput("");
    setNicVerified(false);
    setIsBlocked(false);
    setCustomerName("");
    setCustomerNic("");
    setGender("");
    setCustomerAddress("");
    setCustomerPhone("");
    setItems([]);
    setCurrentItemImages([]);
    setUploadingImageCount(0);
    setLoanAmount("");
    setSelectedRateId("");
    setRemarks("");
    setManualRateEnabled(false);
    setManualRatePercent("");
    setErrors({});
  };

  // Enter key handlers
  const handleNicKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!nicVerified) {
        handleVerifyNic();
      }
    }
  };

  const handleCustomerFieldKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleStep1Next();
    }
  };

  const handleItemFieldKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handleStep3KeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleStep3Submit();
    }
  };

  return (
    <>
      {loading && <LoadingOverlay isLoading={loading} />}
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create New Pawning Transaction</h1>
          <p className="text-gray-500 mt-1">Complete the 3-step wizard to create a transaction</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex items-center flex-col">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    currentStep === step
                      ? 'bg-primary text-primary-foreground'
                      : currentStep > step
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > step ? <CheckCircle2 className="h-5 w-5" /> : step}
                  </div>
                  <span className="text-xs mt-1 font-medium">
                    {step === 1 ? 'Customer' : step === 2 ? 'Items' : 'Transaction'}
                  </span>
                </div>
                {step < 3 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    currentStep > step ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Customer Verification & Details */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Customer Verification & Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* NIC Verification */}
              <div className="space-y-4 pb-6 border-b">
                <Label htmlFor="nicInput" className="text-sm font-medium">
                  NIC Number <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="nicInput"
                    value={nicInput}
                    onChange={(e) => setNicInput(e.target.value)}
                    onKeyPress={handleNicKeyPress}
                    placeholder="Enter NIC number and press Enter or click Verify"
                    disabled={nicVerified}
                    className={errors.nic ? 'border-red-500' : ''}
                  />
                  <Button
                    onClick={handleVerifyNic}
                    disabled={nicVerifying || nicVerified}
                  >
                    {nicVerifying ? "Verifying..." : nicVerified ? "Verified" : "Verify"}
                  </Button>
                </div>
                {errors.nic && <p className="text-sm text-red-500">{errors.nic}</p>}

                {isBlocked && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Customer Blocked:</strong> {blocklistReason}
                    </AlertDescription>
                  </Alert>
                )}

                {nicVerified && !isBlocked && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertDescription>
                      NIC verified successfully. Please fill in or update customer details below.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Customer Details - Only shown after NIC verification */}
              {nicVerified && !isBlocked && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">
                      Customer Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      onKeyPress={handleCustomerFieldKeyPress}
                      placeholder="Enter customer name"
                      className={errors.customerName ? 'border-red-500' : ''}
                    />
                    {errors.customerName && <p className="text-sm text-red-500">{errors.customerName}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">
                      Gender <span className="text-red-500">*</span>
                    </Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger id="gender" className={errors.gender ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && <p className="text-sm text-red-500">{errors.gender}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Phone Number</Label>
                    <Input
                      id="customerPhone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      onKeyPress={handleCustomerFieldKeyPress}
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idType">ID Type</Label>
                    <Select value={idType} onValueChange={setIdType}>
                      <SelectTrigger id="idType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NIC">National Identity Card (NIC)</SelectItem>
                        <SelectItem value="Passport">Passport</SelectItem>
                        <SelectItem value="DrivingLicense">Driving License</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="customerAddress">
                      Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="customerAddress"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      onKeyPress={handleCustomerFieldKeyPress}
                      placeholder="Enter address"
                      className={errors.customerAddress ? 'border-red-500' : ''}
                    />
                    {errors.customerAddress && <p className="text-sm text-red-500">{errors.customerAddress}</p>}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => navigate("/transactions")}>
                  Cancel
                </Button>
                <Button
                  onClick={handleStep1Next}
                  disabled={!nicVerified || isBlocked}
                >
                  Next: Add Items <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Item Information */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Step 2: Item Information</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {items.length} item(s) added
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="itemDescription">Item Description (Optional)</Label>
                  <Textarea
                    id="itemDescription"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    placeholder="Describe the gold item (optional)"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="itemContent">Item Type</Label>
                  <Select value={itemContent} onValueChange={setItemContent}>
                    <SelectTrigger id="itemContent">
                      <SelectValue placeholder="Select item type" />
                    </SelectTrigger>
                    <SelectContent>
                      {itemTypes.length > 0 ? (
                        itemTypes.map((type) => (
                          <SelectItem key={type.id} value={type.name}>
                            {type.name}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="Ring">Ring</SelectItem>
                          <SelectItem value="Chain">Chain</SelectItem>
                          <SelectItem value="Bracelet">Bracelet</SelectItem>
                          <SelectItem value="Earrings">Earrings</SelectItem>
                          <SelectItem value="Necklace">Necklace</SelectItem>
                          <SelectItem value="Bangle">Bangle</SelectItem>
                          <SelectItem value="Pendant">Pendant</SelectItem>
                          <SelectItem value="Coin">Coin</SelectItem>
                          <SelectItem value="Bar">Bar/Ingot</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {itemTypes.length > 0
                      ? `${itemTypes.length} item types available from database`
                      : 'Loading item types from database...'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="itemCondition">Condition</Label>
                  <Select value={itemCondition} onValueChange={setItemCondition}>
                    <SelectTrigger id="itemCondition">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Fair">Fair</SelectItem>
                      <SelectItem value="Poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="itemWeight">
                    Weight (grams) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="itemWeight"
                    type="number"
                    step="0.01"
                    value={itemWeight}
                    onChange={(e) => setItemWeight(e.target.value)}
                    onKeyPress={handleItemFieldKeyPress}
                    placeholder="Enter weight"
                    className={errors.itemWeight ? 'border-red-500' : ''}
                  />
                  {errors.itemWeight && <p className="text-sm text-red-500">{errors.itemWeight}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="itemKarat">Karat</Label>
                  <Select value={itemKarat} onValueChange={setItemKarat}>
                    <SelectTrigger id="itemKarat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N/A">N/A</SelectItem>
                      <SelectItem value="10K">10K Gold</SelectItem>
                      <SelectItem value="14K">14K Gold</SelectItem>
                      <SelectItem value="18K">18K Gold</SelectItem>
                      <SelectItem value="22K">22K Gold</SelectItem>
                      <SelectItem value="24K">24K Gold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appraisedValue">
                    Appraised Value (LKR) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="appraisedValue"
                    type="number"
                    step="0.01"
                    value={appraisedValue}
                    onChange={(e) => setAppraisedValue(e.target.value)}
                    onKeyPress={handleItemFieldKeyPress}
                    placeholder="Loan-eligible value"
                    className={errors.appraisedValue ? 'border-red-500' : ''}
                  />
                  {errors.appraisedValue && <p className="text-sm text-red-500">{errors.appraisedValue}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marketValue">
                    Market Value (LKR) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="marketValue"
                    type="number"
                    step="0.01"
                    value={marketValue}
                    onChange={(e) => setMarketValue(e.target.value)}
                    onKeyPress={handleItemFieldKeyPress}
                    placeholder="Market/replacement value"
                    className={errors.marketValue ? 'border-red-500' : ''}
                  />
                  {errors.marketValue && <p className="text-sm text-red-500">{errors.marketValue}</p>}
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Item Images (Optional)
                </Label>
                <div className="flex gap-3 items-center">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingImageCount > 0}
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    {uploadingImageCount > 0 ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Uploading {uploadingImageCount} image{uploadingImageCount > 1 ? 's' : ''}…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Images
                      </>
                    )}
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </Button>
                  <span className="text-sm text-muted-foreground py-2">
                    {currentItemImages.length} image(s) ready
                  </span>
                </div>

                {currentItemImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {currentItemImages.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleAddItem} className="gap-2" disabled={uploadingImageCount > 0}>
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>

              {/* Added Items List */}
              {items.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label>Added Items ({items.length})</Label>
                    <div className="text-xs text-muted-foreground">
                      Total: LKR {items.reduce((s, i) => s + i.appraisedValue, 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded border">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            Item {index + 1}: {item.description || "Item"}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                            <span>{item.content || 'N/A'}</span>
                            <span>{item.condition}</span>
                            <span>{item.weightGrams}g</span>
                            <span>{item.karat}</span>
                            <span>LKR {item.appraisedValue.toLocaleString()}</span>
                            <span className="flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" />
                              {item.images.length}
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button onClick={handleStep2Next} disabled={items.length === 0}>
                  Next: Transaction Details <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Transaction Details */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Transaction Confirmation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded">
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium">{customerName}</p>
                  <p className="text-sm text-muted-foreground">{customerNic}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Items</p>
                  <p className="font-medium">{items.length} item(s)</p>
                  <p className="text-sm text-muted-foreground">
                    Total: LKR {items.reduce((s, i) => s + i.appraisedValue, 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loan Amount (LKR)</Label>
                  <Input
                    type="number"
                    value={loanAmount}
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Auto-calculated from items</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      Interest Rate <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleManualRateToggle}
                    >
                      {manualRateEnabled ? "Disable Manual" : "Enable Manual"}
                    </Button>
                  </div>
                  <Select
                    value={selectedRateId}
                    onValueChange={setSelectedRateId}
                    disabled={manualRateEnabled}
                  >
                    <SelectTrigger className={errors.interestRate ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select interest rate" />
                    </SelectTrigger>
                    <SelectContent>
                      {rates.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} - {r.rate_percent || r.ratePercent}% per Month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {manualRateEnabled && (
                    <Input
                      type="number"
                      step="0.01"
                      value={manualRatePercent}
                      onChange={(e) => setManualRatePercent(e.target.value)}
                      onKeyPress={handleStep3KeyPress}
                      placeholder="Enter interest rate (%)"
                      className={errors.manualRate ? 'border-red-500' : ''}
                    />
                  )}
                  {errors.interestRate && <p className="text-sm text-red-500">{errors.interestRate}</p>}
                  {errors.manualRate && <p className="text-sm text-red-500">{errors.manualRate}</p>}
                </div>

                {showPeriodField && (
                  <div className="space-y-2">
                    <Label>Period (months)</Label>
                    <Select value={periodMonths} onValueChange={setPeriodMonths}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[3, 6, 9, 12, 18, 24].map((m) => (
                          <SelectItem key={m} value={String(m)}>
                            {m} months
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2 md:col-span-2">
                  <Label>Remarks</Label>
                  <Textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    onKeyPress={handleStep3KeyPress}
                    placeholder="Add any additional notes"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    Back
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Reset All
                  </Button>
                </div>
                <Button onClick={handleStep3Submit}>
                  Create Transaction
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* PIN Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Manager PIN Required</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="managerPin">Branch Manager PIN</Label>
            <Input
              id="managerPin"
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter PIN"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPinDialog(false)}
              disabled={pinVerifying}
            >
              Cancel
            </Button>
            <Button onClick={handleVerifyPin} disabled={pinVerifying}>
              {pinVerifying ? "Verifying..." : "Verify PIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Summary</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium">{customerName}</p>
                <p className="text-sm text-muted-foreground">{customerNic}</p>
                <p className="text-sm text-muted-foreground">{customerAddress}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Loan Amount</p>
                <p className="font-medium">LKR {Number(loanAmount || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Interest Rate</p>
                <p className="text-sm">
                  {manualRateEnabled ? "Manual" : (selectedRate?.name || "-")} - {effectiveRatePercent}% per annum
                </p>
                <p className="text-xs text-muted-foreground">Period</p>
                <p className="text-sm">{periodMonths} months</p>
              </div>
            </div>

            <div className="rounded border p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Items ({items.length})</p>
                <p className="text-xs text-muted-foreground">
                  Total: LKR {items.reduce((s, i) => s + i.appraisedValue, 0).toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="rounded bg-muted/40 p-2">
                    <p className="text-sm font-medium">
                      Item {index + 1}: {item.description || "Item"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.content || "N/A"} | {item.condition} | {item.weightGrams}g | {item.karat} |
                      Appraised: LKR {item.appraisedValue.toLocaleString()} |
                      Market: LKR {item.marketValue.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {remarks && (
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground mb-1">Remarks</p>
                <p className="text-sm whitespace-pre-wrap">{remarks}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSummary(false)} disabled={loading}>
              Edit
            </Button>
            <Button onClick={handleConfirmSubmit} disabled={loading}>
              {loading ? "Creating..." : "Confirm & Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

