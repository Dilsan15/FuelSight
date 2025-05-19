import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center px-4">
      <h1 className="text-4xl font-bold text-red-600 mb-2">⛔ Unauthorized Access</h1>
      <p className="text-gray-600 mb-6">You do not have permission to view this page.</p>
      <Button onClick={() => navigate(-1)}>Go Back</Button>
    </div>
  );
};

export default UnauthorizedPage;
