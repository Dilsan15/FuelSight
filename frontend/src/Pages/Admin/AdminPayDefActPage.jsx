import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDefPayActs } from "@/Hooks/DefpayactHooks/useDefPayActs";
import { useDeleteDefPayAct } from "@/Hooks/DefpayactHooks/useDeleteDefPayAct";
import { useDefPayAct } from "@/Hooks/DefpayactHooks/useDefPayAct";
import { useSynchronizeBalances } from "@/Hooks/DefpayactHooks/useSynchronizeBalances";
import { useSynchronizeBalance } from "@/Hooks/DefpayactHooks/useSynchronizeBalance";

const ITEMS_PER_PAGE = 10;
const AdminPayDefActPage = () => {
  const { fetchAccounts } = useDefPayActs();
  const { deleteAccount } = useDeleteDefPayAct();
  const { synchronizeBalances, isSynchronizing, error: syncError, result } = useSynchronizeBalances();
  const { synchronizeBalance, isSynchronizing: isSyncingSingle, error: syncSingleError } = useSynchronizeBalance();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [searchBy, setSearchBy] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [allAccounts, setAllAccounts] = useState([]);
  const [syncSuccess, setSyncSuccess] = useState(null);

  useEffect(() => {
    const loadAllAccounts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchAccounts(
          search,
          1,
          1000,
          searchBy,
          sortBy,
          order
        );
        setAllAccounts(response.data || []);
      } catch (err) {
        setError(err.error || "Failed to load accounts.");

        console.error("Error loading accounts:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAllAccounts();
  }, [search, searchBy, sortBy, order]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleDelete = async (accountId) => {
    try {
      await deleteAccount(accountId);
      // Refresh the accounts list after deletion
      const response = await fetchAccounts(
        search,
        1,
        1000,
        searchBy,
        sortBy,
        order
      );
      setAllAccounts(response.data || []);
    } catch (err) {
      console.error(err);
      setError(err.error || "Failed to delete account. Please try again.");
    }
  };

  const handleSynchronize = async () => {
    try {
      setSyncSuccess(null);
      const result = await synchronizeBalances();
      setSyncSuccess(result);
      
      // Refresh the accounts list after synchronization
      const response = await fetchAccounts(
        search,
        1,
        1000,
        searchBy,
        sortBy,
        order
      );
      setAllAccounts(response.data || []);
    } catch (err) {
      console.error(err);
      // Error is already handled by the hook
    }
  };

  const handleSynchronizeSingle = async (accountId) => {
    try {
      await synchronizeBalance(accountId);
      
      // Refresh the accounts list after synchronization
      const response = await fetchAccounts(
        search,
        1,
        1000,
        searchBy,
        sortBy,
        order
      );
      setAllAccounts(response.data || []);
    } catch (err) {
      console.error(err);
      // Error is already handled by the hook
    }
  };

  const filteredAccounts = allAccounts.filter((acc) => {
    const term = search.toLowerCase();
    if (searchBy === "all") {
      return (
        acc.code?.toLowerCase().includes(term) ||
        acc.firstName?.toLowerCase().includes(term) ||
        acc.lastName?.toLowerCase().includes(term) ||
        acc.phoneNumber?.toLowerCase().includes(term) ||
        acc.address?.toLowerCase().includes(term)
      );
    } else if (searchBy === "name") {
      return `${acc.firstName} ${acc.lastName}`.toLowerCase().includes(term);
    } else {
      return acc[searchBy]?.toLowerCase().includes(term);
    }
  });

  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginatedAccounts = filteredAccounts.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE);

  const totalOutstanding = allAccounts.reduce(
    (sum, acc) => sum + (acc.balance || 0),
    0
  );

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-600">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground">
            Manage credit accounts and track balances
          </p>
        </div>
        <Button 
          onClick={handleSynchronize}
          disabled={isSynchronizing}
          variant="outline"
          className="h-11 px-6"
        >
          {isSynchronizing ? "Synchronizing..." : "🔄 Sync All Balances"}
        </Button>
      </div>

      {/* Synchronization Results */}
      {syncSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            ✅ {syncSuccess.message} - Updated {syncSuccess.updatedAccounts} out of {syncSuccess.totalAccounts} accounts
            {syncSuccess.errorCount > 0 && ` (${syncSuccess.errorCount} errors)`}
          </AlertDescription>
        </Alert>
      )}
      
      {syncError && (
        <Alert variant="destructive">
          <AlertDescription>{syncError}</AlertDescription>
        </Alert>
      )}

      {syncSingleError && (
        <Alert variant="destructive">
          <AlertDescription>Individual sync error: {syncSingleError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
            <div className="text-2xl font-bold">{allAccounts.length}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
            <div className="text-2xl font-bold">
              ₹{totalOutstanding.toFixed(2)}
            </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Users Owing Money
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
            <div className="text-2xl font-bold">
              {allAccounts.filter((acc) => acc.balance < 0).length}
            </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
            <div className="text-2xl font-bold">
              ₹{(totalOutstanding / Math.max(allAccounts.length, 1)).toFixed(2)}
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Account List</CardTitle>
              <CardDescription>
                View and manage all credit accounts
              </CardDescription>
            </div>
            <Button onClick={() => navigate("/create-defpayact")}>
              + Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 mb-6">
            <div className="relative w-full max-w-md">
              <Input
                placeholder="Search accounts..."
                value={search}
                onChange={handleSearchChange}
                className="pr-8"
              />
            </div>

            <Select
              value={searchBy}
              onValueChange={(val) => {
                setSearchBy(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Search by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fields</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="code">Code</SelectItem>
                <SelectItem value="phoneNumber">Phone</SelectItem>
                <SelectItem value="address">Address</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(val) => {
                setSortBy(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date Created</SelectItem>
                <SelectItem value="totalOutstanding">Balance</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={order}
              onValueChange={(val) => {
                setOrder(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(6)].map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : paginatedAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground p-8">
                        No accounts found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedAccounts.map((acc) => (
                    <TableRow key={acc._id} className="hover:bg-muted/50">
                      <TableCell
                        className="font-mono cursor-pointer"
                        onClick={() => navigate(`/account-summary/${acc._id}`)}
                      >
                        {acc.code}
                      </TableCell>
                      <TableCell className="font-medium">
                        {acc.firstName} {acc.lastName}
                      </TableCell>
                      <TableCell>{acc.phoneNumber}</TableCell>
                      <TableCell>{acc.address}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={acc.balance > 0 ? "default" : "secondary"}
                        >
                          ₹{acc.balance?.toFixed(2) || "0.00"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSynchronizeSingle(acc._id)}
                            disabled={isSyncingSingle(acc._id)}
                            className="h-8 w-8 p-0"
                            title="Sync balance"
                          >
                            <RefreshCw className={`h-4 w-4 ${isSyncingSingle(acc._id) ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(`/edit-defpayact/${acc._id}`)
                            }
                          >
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will
                                  permanently delete the account.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(acc._id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {!loading && !error && totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <Button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={page >= totalPages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPayDefActPage;
