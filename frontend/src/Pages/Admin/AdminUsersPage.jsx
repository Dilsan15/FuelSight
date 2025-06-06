import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUsers } from "@/Hooks/AuthHooks/useUsers";
import { useDeleteUser } from "@/Hooks/AuthHooks/useDeleteUser";
import { useSynchronizeReadings } from "@/Hooks/ShiftHooks/useSynchronizeReadings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
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

const AdminUsersPage = () => {
  const [refreshToken, setRefreshToken] = useState(0);
  const { users, isLoading, error } = useUsers(refreshToken);
  const { deleteUser, isDeleting } = useDeleteUser();
  const { syncReadings, isLoading: isSyncing } = useSynchronizeReadings();
  const navigate = useNavigate();

  const admins = users?.filter((u) => u.role === "admin") || [];
  const workers = users?.filter((u) => u.role === "worker") || [];

  const formatDateTime = (isoString) => {
    if (!isoString) return "Never";
    const date = new Date(isoString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const handleEdit = (userId) => {
    navigate(`/edit-user/${userId}`);
  };

  const handleDelete = async (id) => {
    const success = await deleteUser(id);
    if (success) setRefreshToken((prev) => prev + 1);
  };

  const handleSyncReadings = async (userId) => {
    try {
      await syncReadings(userId);
      // Refresh the users list to show updated readings
      setRefreshToken((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to sync readings:', error);
    }
  };

  const renderReadings = (readings) => {
    if (!readings?.length) return "None";
    return (
      <div className="space-y-1 text-xs text-muted-foreground">
        {readings
          .sort(
            (a, b) =>
              a.fuelType.localeCompare(b.fuelType) || a.nozzle - b.nozzle
          )
          .map((r, i) => (
            <div key={i}>
              {r.fuelType} - Nozzle {r.nozzle}:{" "}
              {parseFloat(r.closing).toFixed(2)} L
            </div>
          ))}
      </div>
    );
  };

  const renderTableRows = (list, isWorker = false) =>
    list.map((user) => (
      <TableRow key={user._id}>
        <TableCell>{user.username}</TableCell>
        <TableCell>{user.stationName}</TableCell>
        <TableCell>{user.isActive ? "Yes" : "No"}</TableCell>
        <TableCell>{formatDateTime(user.lastLogin)}</TableCell>
        {isWorker && <TableCell>{renderReadings(user.readings)}</TableCell>}
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            {isWorker && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSyncReadings(user._id)}
                disabled={isSyncing}
              >
                {isSyncing ? "Syncing..." : "Sync Readings"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(user._id)}
            >
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    this user account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(user._id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TableCell>
      </TableRow>
    ));

  const renderSkeletonRows = (cols) =>
    Array.from({ length: 10 }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: cols }).map((_, j) => (
          <TableCell key={j}>
            <Skeleton className="h-4 w-full" />
          </TableCell>
        ))}
      </TableRow>
    ));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage admin and petrol pump worker accounts
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-600">Error: {error}</div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-br from-background to-muted border border-border shadow-lg rounded-xl">
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">
                Account List
              </h2>
              <p className="text-sm text-muted-foreground">
                View and manage user accounts and their permissions
              </p>
            </div>
            <Button onClick={() => navigate("/create-user")}>+ Add User</Button>
          </div>

          <div className="mt-6">
            <Tabs defaultValue="admins" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                <TabsTrigger value="admins">Admin Accounts</TabsTrigger>
                <TabsTrigger value="workers">Petrol Accounts</TabsTrigger>
              </TabsList>

              <TabsContent value="admins">
                <div className="rounded-md border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Username</TableHead>
                        <TableHead>Station</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        renderSkeletonRows(5)
                      ) : admins.length > 0 ? (
                        renderTableRows(admins)
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground h-32"
                          >
                            No admin accounts found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="workers">
                <div className="rounded-md border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Username</TableHead>
                        <TableHead>Station</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Readings</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        renderSkeletonRows(6)
                      ) : workers.length > 0 ? (
                        renderTableRows(workers, true)
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-muted-foreground h-32"
                          >
                            No petrol accounts found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsersPage;
