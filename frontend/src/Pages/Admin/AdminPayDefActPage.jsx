import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDefPayActs } from "@/Hooks/DefpayactHooks/useDefPayActs";
import { useDeleteDefPayAct } from "@/Hooks/DefpayactHooks/useDeleteDefPayAct";

const ITEMS_PER_PAGE = 10;

const AdminPayDefActPage = () => {
  const { fetchAccounts } = useDefPayActs();
  const { deleteAccount } = useDeleteDefPayAct();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [searchBy, setSearchBy] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");

  const [page, setPage] = useState(1);
  const [allAccounts, setAllAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAllAccounts = async () => {
      setLoading(true);
      try {
        const { data } = await fetchAccounts(
          search,
          1,
          1000,
          searchBy,
          sortBy,
          order
        );
        setAllAccounts(data || []);
      } catch (err) {
        setError(err.error || "Failed to load accounts.");
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

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this account?"
    );
    if (!confirmed) return;
    try {
      await deleteAccount(id);
      setAllAccounts((prev) => prev.filter((acc) => acc._id !== id));
    } catch (err) {
      alert(err.error || "Failed to delete");
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

  return (
    <div className="p-8 bg-muted min-h-screen space-y-6">
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div className="space-y-2">
          <Card>
            <CardContent className="pt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 flex-wrap">
              {/* Search input */}
              <div className="relative w-full max-w-md">
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={handleSearchChange}
                  className="pr-8"
                />
              </div>

              {/* Search By */}
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
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="phoneNumber">Phone</SelectItem>
                  <SelectItem value="address">Address</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort By */}
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
                  <SelectItem value="totalOutstanding">
                    Balance
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Order */}
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
            </CardContent>
          </Card>
        </div>

        <Button onClick={() => navigate("/create-defpayact")}>
          + Add Account
        </Button>
      </div>

      <Card>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <Table>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : error ? (
            <div className="p-4 text-red-500">{error}</div>
          ) : paginatedAccounts.length === 0 ? (
            <div className="p-4 text-gray-500">No accounts found.</div>
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
                {paginatedAccounts.map((acc) => (
                  <TableRow key={acc._id}>
                    <TableCell
                      className="font-mono text-blue-600 cursor-pointer hover:underline"
                      onClick={() => navigate(`/account-summary/${acc._id}`)}
                    >
                      {acc.code}
                    </TableCell>

                    <TableCell>
                      {acc.firstName} {acc.lastName}
                    </TableCell>
                    <TableCell>{acc.phoneNumber}</TableCell>
                    <TableCell>{acc.address}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{acc.balance?.toFixed(2) || "0.00"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/edit-defpayact/${acc._id}`)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(acc._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!loading && !error && totalPages > 1 && (
        <div className="flex justify-between mt-4">
          <Button
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1}
            variant="outline"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={page >= totalPages}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminPayDefActPage;
