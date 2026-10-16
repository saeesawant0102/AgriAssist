import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { getFarmByIdApi, updateFarmApi } from '../api.js';
import { FarmForm } from '../components/FarmForm.jsx';

export function FarmEdit() {
  const { farmId } = useParams();
  const navigate = useNavigate();

  const [farm, setFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadFarm() {
      try {
        setLoading(true);
        setError(null);
        const data = await getFarmByIdApi(farmId);
        if (isMounted) setFarm(data);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load farm details');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadFarm();
    return () => {
      isMounted = false;
    };
  }, [farmId]);

  const handleSubmit = async (payload) => {
    try {
      setSubmitting(true);
      await updateFarmApi(farmId, payload);
      navigate(`/farms/${farmId}`);
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
          onClick={() => navigate(`/farms/${farmId}`)}
          title="Back to Farm Details"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Farm</h1>
          <p className="text-sm text-slate-500">
            Update farm name, boundaries, or location coordinates.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <Card>
          <div className="p-4 text-center text-red-600 space-y-3">
            <p className="text-sm font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/farms')}>
              Back to Farms
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <FarmForm
            initialValues={farm}
            onSubmit={handleSubmit}
            loading={submitting}
            submitLabel="Save Changes"
            onCancel={() => navigate(`/farms/${farmId}`)}
          />
        </Card>
      )}
    </div>
  );
}
