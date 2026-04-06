import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import NumberInput from "@/components/ui/number-input";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import apiClient from "@/integrations/api";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Camera, Image as ImageIcon, Upload, X } from "lucide-react";
import { compressImageFile, compressImageDataUri } from "@/utils/imageUtils";


type IdType = "NIC" | "Passport" | "DrivingLicense";

type Rate = {
  id: string;
  name: string;
  ratePercent?: number;
  rate_percent?: number;
  firstMonthRatePercent?: number;
  isDefault?: boolean;
};

interface ItemDraft {
  description: string;
  content: string;
  condition: string;
  weight: string;
  karat: string;
  appraisedValue: string;
  marketValue: string;
  images: string[];
}

interface ItemPayload {
  description: string;
  content: string;
  condition: string;
  weightGrams: number;
  karat: string;
  appraisedValue: number;
  marketValue: number;
  images: string[];
}

interface Customer {
  id: string;
  fullName: string;
  nic: string;
  phone?: string;
  address?: string;
  gender?: string
}

const emptyItemDraft: ItemDraft = {
  description: "",
  content: "",
  condition: "Good",
  weight: "",
  karat: "N/A",
  appraisedValue: "",
  marketValue: "",
  images: [],
};

export default function CreatePawningSample() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<Rate[]>([]);
  const [itemTypes, setItemTypes] = useState<any[]>([]);

  // Customer fields
  const [customerName, setCustomerName] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [gender, setGender] = useState("");
  const [idType, setIdType] = useState<IdType>("NIC");
  const [identityVerifying, setIdentityVerifying] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  // Special pattern unlock
  const [specialPattern, setSpecialPattern] = useState("TND");
  const [patternUnlocked, setPatternUnlocked] = useState(false);
  const [patternBuffer, setPatternBuffer] = useState("");
  const [lastKeyTime, setLastKeyTime] = useState(0);

  // Item draft + list
  const [itemDraft, setItemDraft] = useState<ItemDraft>(emptyItemDraft);
  const [items, setItems] = useState<ItemPayload[]>([]);

  // Transaction fields
  const [loanAmount, setLoanAmount] = useState("");
  const [selectedRateId, setSelectedRateId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [periodMonths, setPeriodMonths] = useState("12");

  // Manager override for interest rate
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [managerPin, setManagerPin] = useState("");
  const [pinVerifying, setPinVerifying] = useState(false);
  const [rateOverrideEnabled, setRateOverrideEnabled] = useState(false);
  const [manualInterestRate, setManualInterestRate] = useState("");

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Customer search dropdown state
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const selectingCustomerRef = useRef(false);
  const skipNextAutoSearchRef = useRef(false);
  const selectedNicRef = useRef<string | null>(null);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          acc.weight += item.weightGrams;
          acc.appraised += item.appraisedValue;
          acc.market += item.marketValue;
          return acc;
        },
        { weight: 0, appraised: 0, market: 0 }
      ),
    [items]
  );

  const identityLabel = idType === "NIC" ? "NIC" : idType === "Passport" ? "Passport" : "Driving License";

  const fetchRatesCallback = async () => {
    try {
      const data = await apiClient.interestRates.getActive();
      setRates(data || []);

      // Auto-select default rate if available
      if (data && data.length > 0) {
        const defaultRate = data.find((rate: Rate) => rate.isDefault);
        if (defaultRate) {
          setSelectedRateId(defaultRate.id);
        } else {
          // Fall back to first rate if no default is marked
          setSelectedRateId(data[0].id);
        }
      }
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error("❌ Failed to fetch item types:", error);
      console.error("Error details:", error instanceof Error ? error.message : "Unknown error");
      toast({
        title: "Warning",
        description: `Failed to load item types${error instanceof Error ? `: ${error.message}` : ''}. Using default options.`,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchRatesCallback();
    fetchItemTypes();
    fetchPatternConfig();
  }, []);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    // Skip reset when identity is changed by selecting from dropdown
    if (selectingCustomerRef.current) {
      selectingCustomerRef.current = false;
      return;
    }

    // Reset verification whenever identity type/value changes by manual input
    setIdentityVerified(false);
    setCustomerFound(false);
    setBlockedReason(null);
  }, [idType, identityNumber]);

  useEffect(() => {
    // Skip one auto-search cycle when NIC is set by dropdown selection
    if (skipNextAutoSearchRef.current) {
      skipNextAutoSearchRef.current = false;
      setShowCustomerDropdown(false);
      setCustomerSearchResults([]);
      return;
    }

    // If NIC is already selected + verified, do not trigger dropdown search again
    if (
      idType === "NIC" &&
      identityVerified &&
      customerFound &&
      selectedNicRef.current &&
      selectedNicRef.current === identityNumber.trim()
    ) {
      setShowCustomerDropdown(false);
      setCustomerSearchResults([]);
      return;
    }

    // Auto-search for customers when 5+ digits are entered in the NIC field
    if (idType !== "NIC" || identityNumber.length < 5) {
      setShowCustomerDropdown(false);
      setCustomerSearchResults([]);
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
        setSearchDebounceTimer(null);
      }
      return;
    }

    // Clear previous timeout
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    // Set new debounced search
    const timer = setTimeout(async () => {
      try {
        setIdentityVerifying(true);

        // Check blacklist first
        const result = await apiClient.blacklist.verifyNic(identityNumber.trim());

        if (result?.isBlocked) {
          setShowCustomerDropdown(false);
          setBlockedReason(result.blocklistReason || "Customer is blocked");
          setIdentityVerifying(false);
          return;
        }

        // Search for matching customers
        const searchResult = await apiClient.customers.search(identityNumber.trim(), 0, 10);
        const customers = searchResult?.content || [];

        if (customers.length > 0) {
          setCustomerSearchResults(customers);
          setShowCustomerDropdown(true);
        } else {
          setShowCustomerDropdown(false);
          setCustomerSearchResults([]);
        }
      } catch (error) {
        console.log('Search error:', error);
        setCustomerSearchResults([]);
        setShowCustomerDropdown(false);
      } finally {
        setIdentityVerifying(false);
      }
    }, 500); // 500ms debounce

    setSearchDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [identityNumber, idType, identityVerified, customerFound]);

  const handleSelectCustomer = (customer: Customer) => {
    // Mark as programmatic selection to avoid resetting verified state
    selectingCustomerRef.current = true;
    // Also skip the next auto-search effect so dropdown does not re-open
    skipNextAutoSearchRef.current = true;
    selectedNicRef.current = customer.nic || null;

    setIdentityNumber(customer.nic || "");
    setCustomerName(customer.fullName || "");
    setCustomerPhone(customer.phone || "");
    setCustomerAddress(customer.address || "");
    setGender(customer.gender || "");  // ADD GENDER
    setCustomerFound(true);
    setIdentityVerified(true);
    setShowCustomerDropdown(false);
    setCustomerSearchResults([]);
  };

  useEffect(() => {
    // Global keydown listener for stealth pattern unlock
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field (except our special pattern logic)
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

      // Check if buffer matches pattern
      const newBuffer = currentTime - lastKeyTime > 2000 ? key : patternBuffer + key;
      if (newBuffer.length >= specialPattern.length) {
        const lastChars = newBuffer.slice(-specialPattern.length);
        if (lastChars === specialPattern.toUpperCase()) {
          setPatternUnlocked(true);
          setPatternBuffer("");
          toast({ title: "Special Mode Enabled", description: "Period selection unlocked" });
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [lastKeyTime, patternBuffer, specialPattern, toast]);

  useEffect(() => {
    // Auto-calculate loan amount from total appraised value of added items.
    if (items.length > 0) {
      setLoanAmount(totals.appraised.toFixed(2));
    } else {
      setLoanAmount("");
    }
  }, [items, totals.appraised]);

   const fetchPatternConfig = async () => {
     try {
       const data = await apiClient.pawnTransactions.getPatternConfig();
       if (data?.pattern && typeof data.pattern === "string") {
         setSpecialPattern(data.pattern);
       }
     } catch {
       // keep fallback local default if config fetch fails
       setSpecialPattern("TND");
     }
   };

   const updateDraft = (patch: Partial<ItemDraft>) => {
    setItemDraft((prev) => ({ ...prev, ...patch }));
  };

  const playSuccessSound = () => {
    const audio = new Audio('/success-beep.mp3');
    audio.play().catch(err => console.log('Audio play failed:', err));
  };

  const handleRequestRateOverride = () => {
    setShowPinDialog(true);
    setManagerPin("");
  };

  const handleVerifyManagerPin = async () => {
    if (!managerPin.trim()) {
      toast({ title: "Error", description: "Please enter PIN", variant: "destructive" });
      return;
    }

    try {
      setPinVerifying(true);

      // Get current user email from localStorage
      const currentUserEmail = localStorage.getItem("userEmail") || "";

      if (!currentUserEmail) {
        toast({ title: "Error", description: "User email not found", variant: "destructive" });
        return;
      }

      await apiClient.users.verifyManagerPin(
        currentUserEmail,
        managerPin,
        "Interest Rate Override - Transaction Creation"
      );

      // Success!
      playSuccessSound();
      setRateOverrideEnabled(true);
      setShowPinDialog(false);
      setManualInterestRate("");

      toast({
        title: "Override Enabled",
        description: "You can now manually enter the interest rate (0.1% - 50%)",
      });
    } catch (error: unknown) {
      toast({
        title: "Invalid PIN",
        description: error instanceof Error ? error.message : "Failed to verify PIN",
        variant: "destructive",
      });
    } finally {
      setPinVerifying(false);
    }
  };

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      compressImageFile(file, 1024, 0.8)
        .then((compressed) => {
          setItemDraft((prev) => ({ ...prev, images: [...prev.images, compressed] }));
          toast({ title: "Image Added", description: `"${file.name}" compressed and added` });
        })
        .catch(() => {
          toast({ title: "Error", description: `Failed to process "${file.name}"`, variant: "destructive" });
        });
    }
    // Reset so the same file can be re-selected
    e.target.value = "";
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
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
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch (err: unknown) {
      setCameraError(err instanceof Error ? err.message : "Camera access denied");
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
        setItemDraft((prev) => ({ ...prev, images: [...prev.images, compressed] }));
        toast({ title: "Photo Captured", description: "Photo compressed and added to item" });
        stopCamera();
        setShowCameraDialog(false);
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to process captured photo", variant: "destructive" });
      });
  }, [stopCamera, toast]);

  const removeDraftImage = (index: number) => {
    setItemDraft((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const validateIdentity = (type: IdType, value: string): string | null => {
    const v = value.trim();
    if (!v) return "Identity number is required";

    if (type === "NIC") {
      const nicRegex = /^(?:\d{9}[VvXx]|\d{12})$/;
      if (!nicRegex.test(v)) return "NIC must be 9 digits + V/X or 12 digits";
      return null;
    }

    if (type === "Passport") {
      const passportRegex = /^[A-Za-z0-9]{6,12}$/;
      if (!passportRegex.test(v)) return "Passport must be 6-12 alphanumeric characters";
      return null;
    }

    const licenseRegex = /^[A-Za-z0-9-]{6,15}$/;
    if (!licenseRegex.test(v)) return "Driving License must be 6-15 characters (letters, numbers, hyphen)";
    return null;
  };

  const handleVerifyIdentity = async () => {
    const identityError = validateIdentity(idType, identityNumber);
    if (identityError) {
      toast({ title: "Validation Error", description: identityError, variant: "destructive" });
      return;
    }

    try {
      setIdentityVerifying(true);
      setBlockedReason(null);

      const identity = identityNumber.trim();

      if (idType === "NIC") {
        const result = await apiClient.blacklist.verifyNic(identity);

        if (result?.isBlocked) {
          setIdentityVerified(false);
          setBlockedReason(result.blocklistReason || "Customer is blocked");
          toast({
            title: "Blocked Customer",
            description: result.blocklistReason || "This customer is blocked",
            variant: "destructive",
          });
          return;
        }

        if (result?.customer) {
          setCustomerName(result.customer.fullName || "");
          setCustomerPhone(result.customer.phone || "");
          setCustomerAddress(result.customer.address || "");
          setCustomerFound(true);
        } else {
          setCustomerFound(false);
        }

        setIdentityVerified(true);
        toast({
          title: "Identity Verified",
          description: result?.customer
            ? "Customer auto-filled from database"
            : "No existing customer found. Enter details manually.",
        });
        return;
      }

      // Passport / DrivingLicense: attempt lookup using same endpoint value
      try {
        const customer = await apiClient.customers.getByNic(identity);
        setCustomerName(customer.fullName || "");
        setCustomerPhone(customer.phone || "");
        setCustomerAddress(customer.address || "");
        setCustomerFound(true);
        toast({ title: "Identity Verified", description: "Customer auto-filled from database" });
      } catch {
        setCustomerFound(false);
        toast({ title: "Identity Verified", description: "No existing customer found. Enter details manually." });
      }

      setIdentityVerified(true);
    } catch (error: unknown) {
      toast({
        title: "Verification Error",
        description: "Failed to verify identity",
        variant: "destructive",
      });
    } finally {
      setIdentityVerifying(false);
    }
  };

  const handleAddItem = () => {
    if (!itemDraft.weight || parseFloat(itemDraft.weight) <= 0) {
      toast({ title: "Validation Error", description: "Please enter valid item weight", variant: "destructive" });
      return;
    }
    if (!itemDraft.appraisedValue || parseFloat(itemDraft.appraisedValue) <= 0) {
      toast({ title: "Validation Error", description: "Please enter valid appraised value", variant: "destructive" });
      return;
    }
    if (!itemDraft.marketValue || parseFloat(itemDraft.marketValue) <= 0) {
      toast({ title: "Validation Error", description: "Please enter valid market value", variant: "destructive" });
      return;
    }

    const newItem: ItemPayload = {
      description: itemDraft.description || "Gold Item",
      content: itemDraft.content,
      condition: itemDraft.condition,
      weightGrams: parseFloat(itemDraft.weight),
      karat: itemDraft.karat,
      appraisedValue: parseFloat(itemDraft.appraisedValue),
      marketValue: parseFloat(itemDraft.marketValue),
      images: itemDraft.images,
    };

    setItems((prev) => [...prev, newItem]);
    setItemDraft(emptyItemDraft);

    toast({ title: "Item Added", description: `Added item ${items.length + 1}` });
  };

  const handleItemKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateTransaction = () => {
    if (!customerName.trim() || !customerAddress.trim() || !gender) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required customer fields",
        variant: "destructive",
      });
      return;
    }

    const identityError = validateIdentity(idType, identityNumber);
    if (identityError) {
      toast({ title: "Validation Error", description: identityError, variant: "destructive" });
      return;
    }

    if (!identityVerified) {
      toast({ title: "Validation Error", description: "Please verify identity first", variant: "destructive" });
      return;
    }

    if (blockedReason) {
      toast({ title: "Blocked Customer", description: blockedReason, variant: "destructive" });
      return;
    }

    if (items.length === 0) {
      toast({ title: "Validation Error", description: "Please add at least one item", variant: "destructive" });
      return;
    }

    if (!rateOverrideEnabled && !selectedRateId) {
      toast({ title: "Validation Error", description: "Please select an interest rate", variant: "destructive" });
      return;
    }

    if (rateOverrideEnabled && (!manualInterestRate || parseFloat(manualInterestRate) <= 0)) {
      toast({ title: "Validation Error", description: "Please enter a valid interest rate", variant: "destructive" });
      return;
    }

    const rateValue = rateOverrideEnabled ? parseFloat(manualInterestRate) : 0;
    if (rateOverrideEnabled && (rateValue < 0.1 || rateValue > 50)) {
      toast({
        title: "Validation Error",
        description: "Interest rate must be between 0.1% and 50%",
        variant: "destructive"
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmSubmit = async () => {
    try {
      setLoading(true);
      setShowConfirmDialog(false);

      const today = new Date();
      const pawnDate = today.toISOString().split("T")[0];
      const maturityDate = new Date(today);
      maturityDate.setMonth(maturityDate.getMonth() + parseInt(periodMonths, 10));
      const maturityDateStr = maturityDate.toISOString().split("T")[0];

      let effectiveRatePercent;
      let firstMonthRatePercent;
      if (rateOverrideEnabled && manualInterestRate) {
        effectiveRatePercent = parseFloat(manualInterestRate);
        firstMonthRatePercent = effectiveRatePercent / 12;
      } else {
        const selectedRate = rates.find((r) => r.id === selectedRateId);
        effectiveRatePercent = selectedRate?.rate_percent || selectedRate?.ratePercent || 0;
        firstMonthRatePercent = selectedRate?.firstMonthRatePercent || effectiveRatePercent / 12;
      }

      const firstItem = items[0];

        const transactionData = {
          customerName,
          customerNic: identityNumber.trim(),
          idType,
          gender,
          customerAddress,
          customerPhone,
          customerType: "Regular",
          itemDescription: items.length > 1 ? `Multiple items (${items.length})` : firstItem.description,
          itemContent: firstItem.content,
          itemCondition: firstItem.condition,
          itemWeightGrams: totals.weight,
          itemKarat: firstItem.karat,
          appraisedValue: totals.appraised,
          loanAmount: parseFloat(loanAmount || "0"),
          interestRateId: selectedRateId,
          interestRatePercent: effectiveRatePercent,
          firstMonthInterestRatePercent: firstMonthRatePercent,
          rateOverride: rateOverrideEnabled,
          periodMonths: parseInt(periodMonths, 10),
          patternMode: patternUnlocked ? "B" : "A",
          pawnDate,
          maturityDate: maturityDateStr,
          remarks,
          items,
        };

      const response = await apiClient.pawnTransactions.create(transactionData);

      toast({
        title: "Success",
        description: `Pawning transaction created successfully! Pawn ID: ${response.pawnId || response.pawn_id}`,
      });

      setCustomerName("");
      setIdentityNumber("");
      setCustomerPhone("");
      setCustomerAddress("");
      setGender("");
      setIdType("NIC");
      setIdentityVerified(false);
      setCustomerFound(false);
      setBlockedReason(null);
      setPatternUnlocked(false);
      setPatternBuffer("");
      setPeriodMonths("12");
      setItemDraft(emptyItemDraft);
      setItems([]);
      setLoanAmount("");
      setSelectedRateId("");
      setRemarks("");
      setRateOverrideEnabled(false);
      setManualInterestRate("");
      setShowPinDialog(false);
      setManagerPin("");

      navigate("/transactions/create");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "Failed to create transaction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedRateName = rates.find((r) => r.id === selectedRateId)?.name || "Not selected";
  const selectedRateValue = rates.find((r) => r.id === selectedRateId)?.rate_percent || rates.find((r) => r.id === selectedRateId)?.ratePercent || 0;

  return (
    <>
      {loading && <LoadingOverlay isLoading={loading} />}
      <div className="h-[calc(100vh-4rem)] overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold">Create Pawning Transaction</h1>
          {patternUnlocked && (
            <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">SPECIAL MODE</span>
          )}
        </div>

        <Card className="h-[calc(100%-2.5rem)] flex flex-col">
          <CardContent className="flex-1 overflow-hidden pt-4">
            <div className="grid grid-cols-12 gap-4 h-full">
              <div className="col-span-7 flex flex-col overflow-hidden pr-2">
                <div className="flex-1 overflow-y-auto space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm border-b pb-1">Customer Information</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 pl-2">
                        <Label htmlFor="idType" className="text-xs">Identity Type <span className="text-red-500">*</span></Label>
                        <Select value={idType} onValueChange={(v: IdType) => setIdType(v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NIC">NIC</SelectItem>
                            <SelectItem value="Passport">Passport</SelectItem>
                            <SelectItem value="DrivingLicense">Driving License</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 pr-2">
                        <Label htmlFor="identityNumber" className="text-xs">{identityLabel} Number <span className="text-red-500">*</span></Label>
                        <div className="space-y-1">
                          <Input
                            id="identityNumber"
                            value={identityNumber}
                            onChange={(e) => setIdentityNumber(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleVerifyIdentity();
                              }
                            }}
                            placeholder={`Enter ${identityLabel.toLowerCase()} number`}
                            className="h-8 text-sm"
                          />
                          {showCustomerDropdown && customerSearchResults.length > 0 && (
                            <div className="border rounded-md bg-white shadow-lg z-50 max-h-40 overflow-y-auto">
                              {customerSearchResults.map((customer) => (
                                <button
                                  key={customer.id}
                                  type="button"
                                  onClick={() => handleSelectCustomer(customer)}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b last:border-b-0"
                                >
                                  <p className="font-medium text-xs">{customer.fullName}</p>
                                  <p className="text-xs text-blue-600">NIC: {customer.nic}</p>
                                  {customer.phone && <p className="text-xs text-gray-600">{customer.phone}</p>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {identityVerified && !blockedReason && (
                          <p className="text-[11px] text-green-600">
                            Verified {customerFound ? "- customer auto-filled" : "- no existing record"}
                          </p>
                        )}
                        {blockedReason && <p className="text-[11px] text-red-600">{blockedReason}</p>}
                        {identityVerifying && <p className="text-[11px] text-blue-600">Searching...</p>}
                      </div>

                      <div className="space-y-1 pl-2">
                        <Label htmlFor="customerName" className="text-xs">Name <span className="text-red-500">*</span></Label>
                        <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-8 text-sm" />
                      </div>

                      <div className="space-y-1 pr-2">
                        <Label htmlFor="gender" className="text-xs">Gender <span className="text-red-500">*</span></Label>
                        <Select value={gender} onValueChange={setGender}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 pl-2">
                        <Label htmlFor="customerPhone" className="text-xs">Phone</Label>
                        <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="h-8 text-sm" />
                      </div>

                      <div className="space-y-1 pr-2">
                        <Label htmlFor="customerAddress" className="text-xs">Address <span className="text-red-500">*</span></Label>
                        <Input id="customerAddress" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pl-2 pr-2">
                    <h3 className="font-semibold text-sm border-b pb-1">Item Editor (Press Enter to Add)</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Select value={itemDraft.content} onValueChange={(v) => updateDraft({ content: v })}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
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
                                <SelectItem value="Necklace">Necklace</SelectItem>
                                <SelectItem value="Earrings">Earrings</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                          {itemTypes.length > 0
                            ? `${itemTypes.length} types from DB`
                            : 'Loading types...'}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Condition</Label>
                        <Select value={itemDraft.condition} onValueChange={(v) => updateDraft({ condition: v })}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Excellent">Excellent</SelectItem>
                            <SelectItem value="Good">Good</SelectItem>
                            <SelectItem value="Fair">Fair</SelectItem>
                            <SelectItem value="Poor">Poor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Weight (g) *</Label>
                        <NumberInput value={itemDraft.weight} onChange={(value) => updateDraft({ weight: value })} onKeyDown={handleItemKeyDown} />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Karat</Label>
                        <Select value={itemDraft.karat} onValueChange={(v) => updateDraft({ karat: v })}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="N/A">N/A</SelectItem>
                            <SelectItem value="10K">10K</SelectItem>
                            <SelectItem value="14K">14K</SelectItem>
                            <SelectItem value="18K">18K</SelectItem>
                            <SelectItem value="22K">22K</SelectItem>
                            <SelectItem value="24K">24K</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Appraised (LKR) *</Label>
                        <NumberInput value={itemDraft.appraisedValue} onChange={(value) => updateDraft({ appraisedValue: value })} onKeyDown={handleItemKeyDown} />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Market (LKR) *</Label>
                        <NumberInput value={itemDraft.marketValue} onChange={(value) => updateDraft({ marketValue: value })} onKeyDown={handleItemKeyDown} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        value={itemDraft.description}
                        onChange={(e) => updateDraft({ description: e.target.value })}
                        onKeyDown={handleItemKeyDown}
                        rows={1}
                        className="text-sm resize-none min-h-0 h-8 py-1"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1"><ImageIcon className="h-3 w-3" />Current Item Images</Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById("image-upload-sample")?.click()}
                          className="h-7 text-xs"
                        >
                          <Upload className="h-3 w-3 mr-1" />Upload
                          <input id="image-upload-sample" type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={openCamera}
                          className="h-7 text-xs"
                        >
                          <Camera className="h-3 w-3 mr-1" />Camera
                        </Button>
                        <span className="text-xs text-muted-foreground">{itemDraft.images.length} image(s)</span>
                      </div>

                      {itemDraft.images.length > 0 && (
                        <div className="grid grid-cols-6 gap-1">
                          {itemDraft.images.map((preview, index) => (
                            <div key={index} className="relative group">
                              <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-10 object-cover rounded border" />
                              <button
                                type="button"
                                onClick={() => removeDraftImage(index)}
                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"
                              >
                                <X className="h-2 w-2" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-5 flex flex-col overflow-hidden pl-2">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm border-b pb-1">Added Items ({items.length})</h3>
                  <div className="border rounded-lg p-3 bg-white h-32 overflow-y-auto">
                    {items.length > 0 ? (
                      <div className="space-y-2">
                        {items.map((item, index) => (
                          <div key={`${item.description}-${index}`} className="flex items-start justify-between gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <div className="w-12 h-12 rounded border bg-white overflow-hidden shrink-0">
                                {item.images && item.images.length > 0 ? (
                                  <img
                                    src={item.images[0]}
                                    alt={`Item ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                                    No Img
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900">Item {index + 1}</p>
                                <p className="text-xs text-gray-600 truncate">{item.description}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Weight: <span className="font-medium">{item.weightGrams}g</span> | Karat: <span className="font-medium">{item.karat}</span>
                                </p>
                                {item.images && item.images.length > 1 && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">+{item.images.length - 1} more image(s)</p>
                                )}
                              </div>
                            </div>
                            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRemoveItem(index)}>
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-center">
                        <p className="text-sm text-gray-400">No items added yet</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pl-2 pr-2">
                  <h3 className="font-semibold text-sm border-b pb-1">Transaction Details</h3>

                  <div className="space-y-1">
                    <Label htmlFor="loanAmount" className="text-xs">Loan Amount (LKR)</Label>
                    <NumberInput id="loanAmount" value={loanAmount} onChange={(value) => setLoanAmount(value)} disabled />
                    <p className="text-[11px] text-muted-foreground">Auto-filled from total appraised value</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Interest Rate <span className="text-red-500">*</span></Label>
                        {!rateOverrideEnabled && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs text-blue-600"
                            onClick={handleRequestRateOverride}
                          >
                            Override
                          </Button>
                        )}
                      </div>

                       {rateOverrideEnabled ? (
                         <div className="space-y-1">
                           <NumberInput
                             value={manualInterestRate}
                             onChange={(value) => {
                               setManualInterestRate(value);
                             }}
                             placeholder="0.1 - 50"
                             className="border-amber-500"
                           />
                           <p className="text-[10px] text-amber-600">⚠️ Manager override (0.1% - 50%)</p>
                         </div>
                       ) : (
                         <Select value={selectedRateId} onValueChange={setSelectedRateId}>
                           <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select rate" /></SelectTrigger>
                           <SelectContent>
                             {rates.map((r) => (
                               <SelectItem key={r.id} value={r.id}>
                                 {r.name} - {r.rate_percent || r.ratePercent}% per annum
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       )}
                    </div>

                    {patternUnlocked ? (
                      <div className="space-y-1">
                        <Label className="text-xs">Period (months)</Label>
                        <Select value={periodMonths} onValueChange={setPeriodMonths}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 month</SelectItem>
                            <SelectItem value="3">3 months</SelectItem>
                            <SelectItem value="12">12 months</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label className="text-xs">Period (months)</Label>
                        <Input value="12" disabled className="h-8 text-sm" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Remarks</Label>
                    <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>

                <div className="flex-shrink-0 space-y-2 pt-4 border-t mt-4">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate("/transactions")} className="flex-1 h-9 text-sm">Cancel</Button>
                    <Button onClick={handleCreateTransaction} disabled={loading} className="flex-1 h-9 text-sm">Create Transaction</Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Transaction</DialogTitle>
            <DialogDescription>Please review the transaction details before submitting</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm border-b pb-1">Customer Information</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><span className="text-muted-foreground">Name:</span><span className="ml-2 font-medium">{customerName}</span></div>
                <div><span className="text-muted-foreground">{identityLabel}:</span><span className="ml-2 font-medium">{identityNumber}</span></div>
                <div><span className="text-muted-foreground">Gender:</span><span className="ml-2 font-medium">{gender}</span></div>
                <div><span className="text-muted-foreground">Phone:</span><span className="ml-2 font-medium">{customerPhone || "N/A"}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Address:</span><span className="ml-2 font-medium">{customerAddress}</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm border-b pb-1">Items ({items.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {items.map((item, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded border text-sm">
                    <p className="font-medium">Item {index + 1}: {item.description || "Gold Item"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Type: {item.content} | Condition: {item.condition} | Weight: {item.weightGrams}g | Karat: {item.karat}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm border-b pb-1">Transaction Summary</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-muted/50 p-3 rounded">
                <div><span className="text-muted-foreground">Total Items:</span><span className="ml-2 font-medium">{items.length}</span></div>
                <div><span className="text-muted-foreground">Total Weight:</span><span className="ml-2 font-medium">{totals.weight.toFixed(2)} g</span></div>
                <div><span className="text-muted-foreground">Total Appraised:</span><span className="ml-2 font-medium">LKR {totals.appraised.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Total Market:</span><span className="ml-2 font-medium">LKR {totals.market.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Loan Amount:</span><span className="ml-2 font-semibold text-primary">LKR {Number(loanAmount || 0).toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Period:</span><span className="ml-2 font-medium">{periodMonths} months</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Interest Rate:</span><span className="ml-2 font-medium">{selectedRateName} ({selectedRateValue}% per annum)</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Pattern Mode:</span><span className="ml-2 font-medium">{patternUnlocked ? "B" : "A"}</span></div>
                {remarks && <div className="col-span-2"><span className="text-muted-foreground">Remarks:</span><span className="ml-2 font-medium">{remarks}</span></div>}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manager PIN Required</DialogTitle>
            <DialogDescription>
              Enter your manager PIN to override the interest rate
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="managerPin">PIN</Label>
              <Input
                id="managerPin"
                type="password"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleVerifyManagerPin();
                  }
                }}
                placeholder="Enter your PIN"
                maxLength={6}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPinDialog(false)}
              disabled={pinVerifying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyManagerPin}
              disabled={pinVerifying || !managerPin.trim()}
            >
              {pinVerifying ? "Verifying..." : "Verify PIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Dialog */}
      <Dialog open={showCameraDialog} onOpenChange={(open) => { if (!open) { stopCamera(); setShowCameraDialog(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Camera className="h-4 w-4" />Capture Photo</DialogTitle>
            <DialogDescription>Position the item and press Capture to take a photo.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {cameraError ? (
              <div className="w-full rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 text-center">
                <p className="font-semibold mb-1">Camera unavailable</p>
                <p>{cameraError}</p>
                <p className="mt-2 text-xs text-muted-foreground">Check browser permissions and try again.</p>
              </div>
            ) : (
              <div className="w-full rounded-lg overflow-hidden bg-black border">
                <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-72 object-cover" />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { stopCamera(); setShowCameraDialog(false); }}>Cancel</Button>
            {!cameraError && (
              <Button onClick={capturePhoto} className="gap-2">
                <Camera className="h-4 w-4" />Capture Photo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}



