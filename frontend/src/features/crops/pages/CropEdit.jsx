import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { getCropByIdApi, updateCropApi } from '../api.js';
import { CropForm } from '../components/CropForm.jsx';

export function CropEdit() {
  const { cropId } = useParams();
  const navigate = useNavigate();

  const [crop, setCrop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadCrop() {
      try {
        setLoading(true);
        setError(null);
        const data = await getCropByIdApi(cropId);
        if (isMounted) setCrop(data);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load crop details');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadCrop();
    return () => {
      isMounted = false;
    };
  }, [cropId]);

  const handleSubmit = async (payload) => {
    try {
      setSubmitting(true);
      await updateCropApi(cropId, payload);
      navigate(`/crops/${cropId}`);
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
          onClick={() => navigate(`/crops/${cropId}`)}
          title="Back to Crop Details"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Crop</h1>
          <p className="text-sm text-slate-500">
            Update crop name, variety, sowing or harvest dates.
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
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <CropForm
            initialValues={crop}
            onSubmit={handleSubmit}
            loading={submitting}
            submitLabel="Save Changes"
            onCancel={() => navigate(`/crops/${cropId}`)}
          />
        </Card>
      )}
    </div>
  );
}
