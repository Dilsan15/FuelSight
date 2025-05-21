import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCreateUser } from '@/Hooks/AuthHooks/useCreateUser';
import { useEditUser } from '@/Hooks/AuthHooks/useEditUser';
import { useUsers } from '@/Hooks/AuthHooks/useUsers';
import MultiSelect from '@/components/ui/multiselect';


const allFuelTypes = ['XG', 'HSD', 'MS'];

const CreateUserForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { users, isLoading, error: loadError } = useUsers();
  const { createUser, isCreating, error: createError } = useCreateUser();
  const { editUser, isUpdating, error: updateError } = useEditUser();

  const existingUser = users.find((u) => u._id === id);

  const [form, setForm] = useState({
    username: '',
    password: '',
    role: 'worker',
    stationName: '',
    isActive: true,
    fuelTypes: [],
    nozzleConfig: {},
    readings: []
  });

  useEffect(() => {
    if (isEdit && existingUser) {
      const grouped = {};
      existingUser.readings?.forEach((r) => {
        if (!grouped[r.fuelType]) grouped[r.fuelType] = [];
        grouped[r.fuelType].push(r);
      });

      setForm({
        username: existingUser.username || '',
        password: '',
        stationName: existingUser.stationName || '',
        role: existingUser.role || 'worker',
        isActive: existingUser.isActive ?? true,
        fuelTypes: Object.keys(grouped),
        nozzleConfig: Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.length])),
        readings: existingUser.readings || []
      });
    }
  }, [existingUser]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFuelSelect = (selected) => {
    const updatedNozzleConfig = { ...form.nozzleConfig };
    selected.forEach((f) => {
      if (!updatedNozzleConfig[f]) updatedNozzleConfig[f] = 1;
    });

    const newReadings = selected.flatMap((fuelType) =>
      Array.from({ length: updatedNozzleConfig[fuelType] }).map((_, i) => {
        const existing = form.readings.find(r => r.fuelType === fuelType && r.nozzle === i + 1);
        return {
          fuelType,
          nozzle: i + 1,
          closing: existing?.closing || ''
        };
      })
    );

    setForm((prev) => ({
      ...prev,
      fuelTypes: selected,
      nozzleConfig: updatedNozzleConfig,
      readings: newReadings
    }));
  };

  const handleNozzleCountChange = (fuelType, count) => {
    const nozzleCount = parseInt(count);
    const updatedReadings = [
      ...form.readings.filter(r => r.fuelType !== fuelType),
      ...Array.from({ length: nozzleCount }).map((_, i) => {
        const existing = form.readings.find(r => r.fuelType === fuelType && r.nozzle === i + 1);
        return {
          fuelType,
          nozzle: i + 1,
          closing: existing?.closing || ''
        };
      })
    ];

    setForm((prev) => ({
      ...prev,
      nozzleConfig: { ...prev.nozzleConfig, [fuelType]: nozzleCount },
      readings: updatedReadings
    }));
  };

  const handleReadingChange = (fuelType, nozzle, value) => {
    const updated = form.readings.map((r) =>
      r.fuelType === fuelType && r.nozzle === nozzle
        ? { ...r, closing: value }
        : r
    );
    setForm(prev => ({ ...prev, readings: updated }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      readings: form.readings.map(r => ({
        fuelType: r.fuelType,
        nozzle: r.nozzle,
        closing: Number(r.closing || 0)
      }))
    };

    delete payload.nozzleConfig;
    delete payload.fuelTypes;

    if (isEdit && !form.password) {
      delete payload.password;
    }

    const success = isEdit
      ? await editUser(id, payload)
      : await createUser(payload);

    if (success) navigate('/admin-users');
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <Card className="bg-white shadow-md border border-gray-200 rounded-xl">
        <CardContent className="p-6 space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {isEdit ? 'Edit User' : 'Create New User'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label>Username</Label>
              <Input
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                className="bg-gray-50"
              />
            </div>

            {!isEdit && (
              <div>
                <Label>Password</Label>
                <Input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="bg-gray-50"
                />
              </div>
            )}

            {isEdit && (
              <div>
                <Label>New Password (optional)</Label>
                <Input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current"
                  className="bg-gray-50"
                />
              </div>
            )}

            <div>
              <Label>Station Name</Label>
              <Input
                name="stationName"
                value={form.stationName}
                onChange={handleChange}
                required
                className="bg-gray-50"
              />
            </div>

            <div>
              <Label>Role</Label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm"
              >
                <option value="worker">Worker</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <Label className="text-sm">Active</Label>
            </div>

            {form.role === 'worker' && (
              <div className="space-y-4">
                <Label className="block text-sm font-medium text-gray-700">Fuel Types</Label>
                <MultiSelect
                  options={allFuelTypes}
                  value={form.fuelTypes}
                  onChange={handleFuelSelect}
                  placeholder="Select fuel types"
                />

                {form.fuelTypes.map((fuelType) => (
                  <div key={fuelType} className="border p-3 rounded-md bg-gray-50 space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Nozzles for {fuelType}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.nozzleConfig[fuelType] || 1}
                      onChange={(e) => handleNozzleCountChange(fuelType, e.target.value)}
                      className="w-24 bg-white"
                    />

                    {form.readings
                      .filter(r => r.fuelType === fuelType)
                      .sort((a, b) => a.nozzle - b.nozzle)
                      .map(r => (
                        <div key={`${fuelType}-nozzle-${r.nozzle}`}>
                          <Label className="text-sm">
                            Closing Reading - Nozzle {r.nozzle}
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={r.closing}
                            onChange={(e) =>
                              handleReadingChange(fuelType, r.nozzle, e.target.value)
                            }
                            className="bg-white border-gray-300"
                          />
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            )}

            {(createError || updateError) && (
              <p className="text-red-600 text-sm font-medium">{createError || updateError}</p>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/admin-users')}>
                Back
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isEdit
                  ? isUpdating ? 'Updating...' : 'Update User'
                  : isCreating ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateUserForm;