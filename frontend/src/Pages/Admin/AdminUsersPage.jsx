import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '@/Hooks/AuthHooks/useUsers';
import { useDeleteUser } from '@/Hooks/AuthHooks/useDeleteUser';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const AdminUsersPage = () => {
  const [refreshToken, setRefreshToken] = useState(0);
  const { users, isLoading, error } = useUsers(refreshToken);
  const { deleteUser, isDeleting } = useDeleteUser();
  const navigate = useNavigate();

  const admins = users?.filter((u) => u.role === 'admin') || [];
  const workers = users?.filter((u) => u.role === 'worker') || [];

  const formatDateTime = (isoString) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  const handleEdit = (userId) => {
    navigate(`/edit-user/${userId}`);
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Are you sure you want to delete this user?');
    if (confirmed) {
      const success = await deleteUser(id);
      if (success) setRefreshToken((prev) => prev + 1);
    }
  };

  const renderReadings = (readings) => {
    if (!readings?.length) return 'None';
    return (
      <div className="space-y-1 text-xs text-muted-foreground">
        {readings
          .sort((a, b) =>
            a.fuelType.localeCompare(b.fuelType) || a.nozzle - b.nozzle
          )
          .map((r, i) => (
            <div key={i}>
              {r.fuelType} - Nozzle {r.nozzle}: {r.closing}
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
        <TableCell>{user.isActive ? 'Yes' : 'No'}</TableCell>
        <TableCell>{formatDateTime(user.lastLogin)}</TableCell>
        {isWorker && (
          <TableCell>{renderReadings(user.readings)}</TableCell>
        )}
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => handleEdit(user._id)}>Edit</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(user._id)}
              disabled={isDeleting}
            >
              Delete
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ));

  const renderSkeletonRows = (cols) =>
    Array.from({ length: 3 }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: cols }).map((_, j) => (
          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
        ))}
      </TableRow>
    ));

  return (
    <div className="p-8 bg-muted min-h-screen space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
        <Button onClick={() => navigate('/create-user')}>+ Add User</Button>
      </div>

      {error && <p className="text-red-500">Error: {error}</p>}

      <Tabs defaultValue="admins" className="space-y-4">
        <TabsList>
          <TabsTrigger value="admins">Admin Accounts</TabsTrigger>
          <TabsTrigger value="workers">Petrol Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="admins">
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? renderSkeletonRows(5)
                  : admins.length > 0
                  ? renderTableRows(admins)
                  : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
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
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Readings</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? renderSkeletonRows(6)
                  : workers.length > 0
                  ? renderTableRows(workers, true)
                  : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
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
  );
};

export default AdminUsersPage;
