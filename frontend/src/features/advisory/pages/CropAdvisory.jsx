import React, { useEffect, useState } from 'react';
import { Calendar, History, Sparkles, Sprout } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { getCropsByFarmApi } from '../../crops/api.js';
import { getFarmsApi } from '../../farms/api.js';
import { generateAdvisoryApi, getAdvisoriesByCropApi } from '../api.js';
import { AdvisoryCard } from '../components/AdvisoryCard.jsx';

/**
 * Requirement: Advisory.Generate, Advisory.Display, BR-4, Sequence Diagram 1
 * Main Crop Advisory page for farmers to generate and review weather-based advisories.
 */
export function CropAdvisory() {
  const [farms, setFarms] = useState([]);
  const [crops, setCrops] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [selectedCropId, setSelectedCropId] = useState('');

  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingCrops, setLoadingCrops] = useState(false);
  const [loadingAdvisories, setLoadingAdvisories] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const [advisories, setAdvisories] = useState([]);

  // Fetch farms initially
  useEffect(() => {
    async function loadFarms() {
      try {
        setLoadingFarms(true);
        setError(null);
        const data = await getFarmsApi();
        setFarms(data);
        if (data.length > 0) {
          setSelectedFarmId(String(data[0].farm_id));
        }
      } catch (err) {
        setError(err.message || 'Failed to load farms');
      } finally {
        setLoadingFarms(false);
      }
    }
    loadFarms();
  }, []);

  // Fetch crops when farm changes
  useEffect(() => {
    if (!selectedFarmId) {
      setCrops([]);
      setSelectedCropId('');
      return;
    }

    async function loadCrops() {
      try {
        setLoadingCrops(true);
        setError(null);
        const data = await getCropsByFarmApi(selectedFarmId);
        setCrops(data);
        if (data.length > 0) {
          setSelectedCropId(String(data[0].crop_id));
        } else {
          setSelectedCropId('');
          setAdvisories([]);
        }
      } catch (err) {
        setError(err.message || 'Failed to load crops');
      } finally {
        setLoadingCrops(false);
      }
    }

    loadCrops();
  }, [selectedFarmId]);

  // Fetch advisories when crop changes
  useEffect(() => {
    if (!selectedCropId) {
      setAdvisories([]);
      return;
    }

    async function loadAdvisories() {
      try {
        setLoadingAdvisories(true);
        setError(null);
        const data = await getAdvisoriesByCropApi(selectedCropId);
        setAdvisories(data);
      } catch (err) {
        setError(err.message || 'Failed to load advisories');
      } finally {
        setLoadingAdvisories(false);
      }
    }

    loadAdvisories();
  }, [selectedCropId]);

  // Action: Generate new crop advisory
  const handleGenerateAdvisory = async () => {
    if (!selectedCropId) return;
    try {
      setGenerating(true);
      setError(null);
      const newAdvisory = await generateAdvisoryApi(selectedCropId);
      // Prepend newly generated advisory to list
      setAdvisories((prev) => [newAdvisory, ...prev]);
    } catch (err) {
      setError(err.message || 'Failed to generate advisory');
    } finally {
      setGenerating(false);
    }
  };

  const selectedCrop = crops.find((c) => String(c.crop_id) === String(selectedCropId));
  const latestAdvisory = advisories[0] || null;

  if (loadingFarms) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <EmptyState
        icon={<Sprout className="w-8 h-8" />}
        title="No Farms Found"
        description="You have not registered any farms yet. Please add a farm and plant crops to generate advisories."
        action={<Button to="/farms/new">Add Your First Farm</Button>}
      />
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Crop Advisory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Weather-informed agronomic advice tailored to crop development stages
          </p>
        </div>

        {selectedCropId && (
          <Button
            onClick={handleGenerateAdvisory}
            loading={generating}
            className="self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get Crop Advisory
          </Button>
        )}
      </div>

      {/* Selectors Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="advisory-farm-select" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Select Farm
          </label>
          <Select
            id="advisory-farm-select"
            value={selectedFarmId}
            onChange={(e) => setSelectedFarmId(e.target.value)}
            options={farms.map((f) => ({
              value: String(f.farm_id),
              label: `${f.farm_name} (${f.location})`,
            }))}
          />
        </div>

        <div>
          <label htmlFor="advisory-crop-select" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Select Crop
          </label>
          {loadingCrops ? (
            <div className="h-10 flex items-center px-3">
              <Spinner size="sm" />
            </div>
          ) : crops.length === 0 ? (
            <div className="flex items-center justify-between text-xs text-slate-500 py-2">
              <span>No crops on this farm.</span>
              <Button to={`/farms/${selectedFarmId}`} variant="outline" size="sm">
                Plant Crop
              </Button>
            </div>
          ) : (
            <Select
              id="advisory-crop-select"
              value={selectedCropId}
              onChange={(e) => setSelectedCropId(e.target.value)}
              options={crops.map((c) => ({
                value: String(c.crop_id),
                label: `${c.crop_name} (${c.growth_stage || 'Planted'})`,
              }))}
            />
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-2"
        >
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {/* Main Content Area */}
      {loadingAdvisories && !latestAdvisory ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Spinner size="lg" />
        </div>
      ) : !selectedCropId ? (
        <Card>
          <div className="p-8 text-center text-slate-500">
            <Sprout className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium">Please select a crop to view and generate advisories.</p>
          </div>
        </Card>
      ) : advisories.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="w-8 h-8" />}
          title="No Advisory Yet"
          description={`No advisory has been generated for ${selectedCrop?.crop_name || 'this crop'}. Click "Get Crop Advisory" to analyze current weather conditions.`}
          action={
            <Button onClick={handleGenerateAdvisory} loading={generating}>
              <Sparkles className="w-4 h-4 mr-2" />
              Get Crop Advisory
            </Button>
          }
        />
      ) : (

        <div className="space-y-6">
          {/* Latest Advisory Card */}
          <AdvisoryCard
            advisory={latestAdvisory}
            cropName={selectedCrop?.crop_name || 'Crop'}
          />

          {/* Advisory History List */}
          {advisories.length > 1 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Past Advisory History
                </h3>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                {advisories.slice(1).map((adv) => (
                  <div key={adv.advisory_id} className="p-4 hover:bg-slate-50/60 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" size="sm">
                          {adv.recommendation}
                        </Badge>
                        <span className="text-xs text-slate-500 font-medium">
                          Forecast Date: {adv.date}
                        </span>
                      </div>
                      {adv.created_at && (
                        <span className="text-xs text-slate-400">
                          {new Date(adv.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {adv.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
