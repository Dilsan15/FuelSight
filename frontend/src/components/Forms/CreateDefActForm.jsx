import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

import { useCreateDefPayAct } from '@/Hooks/DefpayactHooks/useCreateDefPayAct';
import { useUpdateDefPayAct } from '@/Hooks/DefpayactHooks/useUpdateDefPayAct';
import { useDefPayAct } from '@/Hooks/DefpayactHooks/useDefPayAct';

const CreateDefPayActForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { createAccount } = useCreateDefPayAct();
  const { updateAccount } = useUpdateDefPayAct();
  const { data: existingData, loading: loadingData, error: loadError } = useDefPayAct(id);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: '',
    note: '',
    code: ''
  });

  const [useDefaultCode, setUseDefaultCode] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ⛳ Prefill if editing
  useEffect(() => {
    if (isEdit && existingData) {
      setFormData({
        firstName: existingData.firstName || '',
        lastName: existingData.lastName || '',
        phoneNumber: existingData.phoneNumber || '',
        address: existingData.address || '',
        note: existingData.note || '',
        code: existingData.code || ''
      });
      setUseDefaultCode(!existingData.code); // If there's no custom code, use default
    }
  }, [existingData, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = { ...formData };
      if (useDefaultCode) delete payload.code;

      if (isEdit) {
        await updateAccount(id, payload);
      } else {
        await createAccount(payload);
      }

      navigate('/admin-accounts');
    } catch (err) {
      setError(err?.error || 'Failed to save account.');
    } finally {
      setLoading(false);
    }
  };

  if (isEdit && loadingData) {
    return <p className="text-center mt-10 text-gray-600">Loading account...</p>;
  }

  if (isEdit && loadError) {
    return <p className="text-center mt-10 text-red-500">Error: {loadError}</p>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{isEdit ? 'Edit Account' : 'Add New Account'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="10-digit Indian number"
                  required
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="useDefaultCode"
                checked={useDefaultCode}
                onCheckedChange={(checked) => setUseDefaultCode(!!checked)}
              />
              <Label htmlFor="useDefaultCode">Use default account code</Label>
            </div>

            {!useDefaultCode && (
              <div>
                <Label htmlFor="code">Custom Code</Label>
                <Input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={handleChange}
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Account' : 'Create Account')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateDefPayActForm;
