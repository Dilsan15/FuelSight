import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { useDayRates } from '@/Hooks/DayrateHooks/useDayRates'; // Fetch latest
import { useCreateDayRate } from '@/Hooks/DayrateHooks/useCreateDayRates'; // Create new

const AdminDayRatePage = () => {
  const { dayRates, isLoading } = useDayRates();
  const { createDayRate, isCreating, error } = useCreateDayRate();

  const [rates, setRates] = useState({ XG: '', HSD: '', MS: '' });

  useEffect(() => {
    if (dayRates?.rates) {
      setRates(dayRates.rates);
    }
  }, [dayRates]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setRates((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const success = await createDayRate(rates);
    if (success) alert('New day rates created!');
    else alert('Failed to create day rates.');
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
      <Card className="shadow-md border border-gray-300 bg-gradient-to-br from-[#fefefe] to-[#f5f5f5]">
        <CardContent className="space-y-6 p-6">
          <h2 className="text-3xl font-extrabold text-gray-800">Create New Fuel Day Rates</h2>

          {['XG', 'HSD', 'MS'].map((type) => (
            <div key={type}>
              <Label className="text-sm font-medium text-gray-700">{type} Rate (₹/L)</Label>
              <Input
                name={type}
                type="number"
                min={0}
                value={isLoading ? '' : rates[type]}
                onChange={handleChange}
                placeholder={isLoading ? 'Loading...' : 'Enter rate'}
                readOnly={isLoading}
                className="bg-gray-50 border-gray-300"
              />
            </div>
          ))}

          <Button onClick={handleSubmit} disabled={isCreating || isLoading}>
            {isCreating ? 'Saving...' : 'Create Rates'}
          </Button>

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDayRatePage;
