import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { createFarmApi } from '../api.js';
import { FarmForm } from '../components/FarmForm.jsx';

export function FarmCreate() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload) => {
    try {
      setSubmitting(true);
      await createFarmApi(payload);
      navigate('/farms');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="p-1.5"
          onClick={() => navigate('/farms')}
          title="Back to Farms"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Add New Farm</h1>
          <p className="text-sm text-slate-500">
            Register your agricultural parcel to enable localized weather and crop advisories.
          </p>
        </div>
      </div>

      <Card>
        <FarmForm
          onSubmit={handleSubmit}
          loading={submitting}
          submitLabel="Create Farm Plot"
          onCancel={() => navigate('/farms')}
        />
      </Card>
    </div>
  );
}
