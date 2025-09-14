import React, { useState, useEffect } from 'react';
import { BarChart3, Calendar, Settings, Download, Search, X, Plus, Database } from 'lucide-react';

interface GA4DataFetcherProps {
  onDataFetched: (data: any[], metadata: any) => void;
  onConnectionToggle: (isConnected: boolean) => void;
  existingDatasets?: any[];
}

interface GA4RequestConfig {
  propertyId: string;
  startDate: string;
  endDate: string;
  dimensions: string[];
  metrics: string[];
  segments: string[];
  audiences: string[];
}

interface GA4Dataset {
  id: string;
  label: string;
  data: any[];
  metadata: any;
  config: GA4RequestConfig;
  color: string;
}

interface GA4Property {
  id: string;
  name: string;
}

// Comprehensive list of GA4 dimensions
const ALL_DIMENSIONS = [
  'date', 'dateHour', 'dateHourMinute', 'year', 'month', 'week', 'day', 'hour', 'minute',
  'country', 'countryId', 'region', 'subContinent', 'continent', 'city', 'cityId', 'metro',
  'latitude', 'longitude', 'language', 'languageCode',
  'deviceCategory', 'deviceModel', 'mobileDeviceBranding', 'mobileDeviceModel', 'operatingSystem',
  'operatingSystemVersion', 'operatingSystemWithVersion', 'browser', 'browserVersion',
  'screenResolution', 'mobileDeviceInfo', 'mobileInputSelector', 'mobileDeviceMarketingName',
  'platform', 'platformVersion', 'appVersion', 'appName', 'appId', 'appInstallerId',
  'channelGroup', 'channelGrouping', 'defaultChannelGroup', 'source', 'medium', 'sourceMedium',
  'campaign', 'campaignId', 'adContent', 'keyword', 'adSourceName', 'adFormat', 'adUnitName',
  'googleAdsAccountName', 'googleAdsAdGroupId', 'googleAdsAdGroupName', 'googleAdsAdNetworkType',
  'googleAdsCampaignId', 'googleAdsCampaignName', 'googleAdsCampaignType', 'googleAdsCreativeId',
  'googleAdsCustomerId', 'googleAdsKeyword', 'googleAdsQuery', 'socialNetwork',
  'pageTitle', 'pagePath', 'pagePathPlusQueryString', 'pageLocation', 'pageReferrer',
  'landingPage', 'landingPagePlusQueryString', 'exitPage', 'previousPagePath',
  'hostName', 'searchTerm', 'fileExtension', 'fileName', 'linkDomain', 'linkId', 'linkText', 'linkUrl',
  'outbound', 'videoProvider', 'videoTitle', 'videoUrl', 'videoDuration', 'videoCurrentTime', 'videoPercent', 'videoVisible',
  'eventName', 'customEvent', 'firebaseAppId', 'streamId', 'streamName',
  'cohort', 'cohortNthDay', 'cohortNthMonth', 'cohortNthWeek',
  'sessionSource', 'sessionMedium', 'sessionCampaign', 'sessionDefaultChannelGroup',
  'firstUserSource', 'firstUserMedium', 'firstUserCampaign', 'firstUserDefaultChannelGroup',
  'newVsReturning', 'userType', 'daysSinceLastSession', 'sessionDuration',
  'brandingInterest', 'inMarketCategory', 'lifetimeValue', 'userAgeBracket', 'userGender',
  'interests', 'purchaseRevenue', 'itemAffiliation', 'itemBrand', 'itemCategory', 'itemCategory2',
  'itemCategory3', 'itemCategory4', 'itemCategory5', 'itemId', 'itemName', 'itemPromotionCreativeName',
  'itemPromotionId', 'itemPromotionName', 'itemVariant', 'affiliation', 'coupon', 'creativeName',
  'creativeSlot', 'promotionId', 'promotionName', 'paymentType', 'shippingTier', 'transactionId',
  'audienceId', 'audienceName', 'cohortSpec', 'customUserId'
];

// Comprehensive list of GA4 metrics
const ALL_METRICS = [
  'activeUsers', 'newUsers', 'totalUsers', 'returningUsers', 'userEngagementDuration',
  'engagedSessions', 'engagementRate', 'bounceRate', 'sessions', 'sessionsPerUser',
  'averageSessionDuration', 'screenPageViews', 'screenPageViewsPerSession', 'screenPageViewsPerUser',
  'views', 'eventCount', 'eventCountPerUser', 'eventsPerSession', 'conversions', 'totalRevenue',
  'purchaseRevenue', 'ARPPU', 'ARPU', 'averagePurchaseRevenue', 'averagePurchaseRevenuePerUser',
  'averagePurchaseRevenuePerPayingUser', 'totalPurchasers', 'purchaserConversionRate',
  'firstTimePurchasers', 'firstTimePurchaserConversionRate', 'cohortActiveUsers', 'cohortTotalUsers',
  'retentionRate', 'rollingRetentionRate', 'dauPerMau', 'dauPerWau', 'wauPerMau',
  'itemsViewed', 'itemsAddedToCart', 'itemsCheckedOut', 'itemsPurchased', 'itemRevenue',
  'itemRefundAmount', 'cartToViewRate', 'checkoutToViewRate', 'purchaseToViewRate',
  'addToCarts', 'checkouts', 'ecommercePurchases', 'itemsClickedInList', 'itemsClickedInPromotion',
  'itemListClickEvents', 'itemListClickThroughRate', 'itemListViewEvents', 'itemPromotionClickThroughRate',
  'itemViewEvents', 'promotionClicks', 'promotionViews', 'refunds', 'shippingAmount', 'taxAmount',
  'transactionRevenue', 'transactions', 'transactionsPerPurchaser', 'totalAdRevenue',
  'adUnitExposure', 'publisherAdClicks', 'publisherAdImpressions', 'crashAffectedUsers',
  'crashFreeUsersRate', 'appExceptionRate', 'organicGoogleSearchAveragePosition',
  'organicGoogleSearchClickThroughRate', 'organicGoogleSearchClicks', 'organicGoogleSearchImpressions',
  'totalAdRevenue', 'adRevenue', 'adImpressions', 'adClicks', 'adExposureTime'
];

export const GA4DataFetcher: React.FC<GA4DataFetcherProps> = ({ 
  onDataFetched, 
  onConnectionToggle,
  existingDatasets = []
}) => {
  const [config, setConfig] = useState<GA4RequestConfig>({
    propertyId: '',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    dimensions: ['date'],
    metrics: ['activeUsers'],
    segments: [],
    audiences: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastFetchedData, setLastFetchedData] = useState<any>(null);
  const [ga4Datasets, setGa4Datasets] = useState<GA4Dataset[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [availableProperties, setAvailableProperties] = useState<GA4Property[]>([]);
  const [availableSegments, setAvailableSegments] = useState<string[]>([]);
  const [availableAudiences, setAvailableAudiences] = useState<string[]>([]);
  
  // Search states
  const [dimensionSearch, setDimensionSearch] = useState('');
  const [metricSearch, setMetricSearch] = useState('');
  const [segmentSearch, setSegmentSearch] = useState('');
  const [audienceSearch, setAudienceSearch] = useState('');
  
  // Dropdown states
  const [showDimensionDropdown, setShowDimensionDropdown] = useState(false);
  const [showMetricDropdown, setShowMetricDropdown] = useState(false);
  const [showSegmentDropdown, setShowSegmentDropdown] = useState(false);
  const [showAudienceDropdown, setShowAudienceDropdown] = useState(false);

  // Enhanced segments with custom support
  const [customSegments, setCustomSegments] = useState<string[]>([]);
  
  // Color palette for datasets
  const COLOR_PALETTE = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4',
    '#84CC16', '#F97316', '#EC4899', '#6366F1', '#14B8A6', '#F59E0B',
    '#DC2626', '#7C3AED', '#0891B2', '#059669', '#D97706', '#BE185D'
  ];

  // Load available properties on component mount
  useEffect(() => {
    loadAvailableProperties();
  }, []);

  // Load segments and audiences when property changes
  useEffect(() => {
    if (config.propertyId) {
      loadSegmentsAndAudiences(config.propertyId);
    }
  }, [config.propertyId]);

  const loadAvailableProperties = async () => {
    try {
      console.log('Loading GA4 properties...');
      const response = await fetch('/.netlify/functions/getGA4Properties');
      console.log('Properties response status:', response.status);
      console.log('Properties response headers:', response.headers.get('content-type'));
      
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const responseText = await response.text();
        console.log('Properties response text:', responseText);
        
        const properties = JSON.parse(responseText);
        console.log('Parsed properties:', properties);
        
        setAvailableProperties(properties);
        if (properties.length > 0 && !config.propertyId) {
          setConfig(prev => ({ ...prev, propertyId: properties[0].id }));
        }
      } else {
        // Function not available or returning HTML - use fallback
        const responseText = await response.text();
        console.warn('GA4 properties function not available, response:', responseText);
        setAvailableProperties([]);
      }
    } catch (error) {
      console.warn('GA4 properties function not available:', error);
      setAvailableProperties([]);
    }
  };

  const loadSegmentsAndAudiences = async (propertyId: string) => {
    try {
      console.log('Loading segments and audiences for property:', propertyId);
      
      const [segmentsResponse, audiencesResponse] = await Promise.all([
        fetch(`/.netlify/functions/getGA4Segments?propertyId=${propertyId}`),
        fetch(`/.netlify/functions/getGA4Audiences?propertyId=${propertyId}`)
      ]);
      
      console.log('Segments response status:', segmentsResponse.status);
      console.log('Audiences response status:', audiencesResponse.status);
      
      if (segmentsResponse.ok && segmentsResponse.headers.get('content-type')?.includes('application/json')) {
        const segmentsText = await segmentsResponse.text();
        console.log('Segments response:', segmentsText);
        const segments = JSON.parse(segmentsText);
        console.log('Parsed segments:', segments);
        // Combine API segments with any custom segments
        const allSegments = [...segments, ...customSegments];
        setAvailableSegments([...new Set(allSegments)]); // Remove duplicates
      } else {
        const segmentsText = await segmentsResponse.text();
        console.warn('Segments response error:', segmentsText);
        setAvailableSegments(customSegments);
      }
      
      if (audiencesResponse.ok && audiencesResponse.headers.get('content-type')?.includes('application/json')) {
        const audiencesText = await audiencesResponse.text();
        console.log('Audiences response:', audiencesText);
        const audiences = JSON.parse(audiencesText);
        console.log('Parsed audiences:', audiences);
        setAvailableAudiences(audiences);
      } else {
        const audiencesText = await audiencesResponse.text();
        console.warn('Audiences response error:', audiencesText);
        setAvailableAudiences([]);
      }
    } catch (error) {
      console.warn('GA4 segments/audiences functions not available:', error);
      setAvailableSegments(customSegments);
      setAvailableAudiences([]);
    }
  };

  const handleConnectionToggle = () => {
    const newConnectionState = !isConnected;
    setIsConnected(newConnectionState);
    onConnectionToggle(newConnectionState);
    
    if (!newConnectionState) {
      // Reset state when disconnecting
      setConfig(prev => ({
        ...prev,
        dimensions: ['date'],
        metrics: ['activeUsers'],
        segments: [],
        audiences: []
      }));
      setError('');
      setLastFetchedData(null);
    }
  };

  const handleFetchData = async () => {
    if (!config.propertyId) {
      setError('Please select a GA4 property');
      return;
    }

    if (config.dimensions.length === 0) {
      setError('Please select at least one dimension');
      return;
    }

    if (config.metrics.length === 0) {
      setError('Please select at least one metric');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Sending GA4 request with config:', config);
      
      const response = await fetch('/.netlify/functions/getGA4Data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('GA4 API Error Details:', errorData);
        } catch (jsonError) {
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
            console.error('GA4 API Error Text:', errorText);
          } catch (textError) {
            // Keep the generic HTTP error message
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('GA4 Data Result:', result);
      setLastFetchedData(result);
      
      // Create a new GA4 dataset
      const newDataset: GA4Dataset = {
        id: Date.now().toString(),
        label: `GA4: ${config.metrics.join(', ')} ${config.segments.length > 0 ? `(${config.segments.join(', ')})` : ''}`,
        data: result.data,
        metadata: result.metadata,
        config: { ...config },
        color: COLOR_PALETTE[ga4Datasets.length % COLOR_PALETTE.length]
      };
      
      setGa4Datasets(prev => [...prev, newDataset]);
      onDataFetched(result.data, { ...result.metadata, ga4Dataset: newDataset });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch GA4 data';
      setError(errorMessage);
      console.error('GA4 fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (field: keyof GA4RequestConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const removeGA4Dataset = (id: string) => {
    setGa4Datasets(prev => prev.filter(dataset => dataset.id !== id));
  };

  const updateGA4DatasetColor = (id: string, color: string) => {
    setGa4Datasets(prev => prev.map(dataset => 
      dataset.id === id ? { ...dataset, color } : dataset
    ));
  };

  const updateGA4DatasetLabel = (id: string, label: string) => {
    setGa4Datasets(prev => prev.map(dataset => 
      dataset.id === id ? { ...dataset, label } : dataset
    ));
  };

  // Filter functions for search
  const filteredDimensions = ALL_DIMENSIONS.filter(dim => 
    dim.toLowerCase().includes(dimensionSearch.toLowerCase())
  );

  const filteredMetrics = ALL_METRICS.filter(metric => 
    metric.toLowerCase().includes(metricSearch.toLowerCase())
  );

  const filteredSegments = availableSegments.filter(segment => 
    segment.toLowerCase().includes(segmentSearch.toLowerCase())
  );

  const filteredAudiences = availableAudiences.filter(audience => 
    audience.toLowerCase().includes(audienceSearch.toLowerCase())
  );

  // Add/remove functions
  const addDimension = (dimension: string) => {
    if (!config.dimensions.includes(dimension)) {
      updateConfig('dimensions', [...config.dimensions, dimension]);
    }
    setDimensionSearch('');
    setShowDimensionDropdown(false);
  };

  const removeDimension = (dimension: string) => {
    updateConfig('dimensions', config.dimensions.filter(d => d !== dimension));
  };

  const addMetric = (metric: string) => {
    if (!config.metrics.includes(metric)) {
      updateConfig('metrics', [...config.metrics, metric]);
    }
    setMetricSearch('');
    setShowMetricDropdown(false);
  };

  const removeMetric = (metric: string) => {
    updateConfig('metrics', config.metrics.filter(m => m !== metric));
  };

  const addSegment = (segment: string) => {
    if (!config.segments.includes(segment)) {
      updateConfig('segments', [...config.segments, segment]);
    }
    setSegmentSearch('');
    setShowSegmentDropdown(false);
  };

  const removeSegment = (segment: string) => {
    updateConfig('segments', config.segments.filter(s => s !== segment));
  };

  const addCustomSegment = () => {
    const segmentName = segmentSearch.trim();
    if (segmentName && !availableSegments.includes(segmentName)) {
      const newCustomSegments = [...customSegments, segmentName];
      setCustomSegments(newCustomSegments);
      setAvailableSegments(prev => [...prev, segmentName]);
      addSegment(segmentName);
    }
    setSegmentSearch('');
    setShowSegmentDropdown(false);
  };

  const addAudience = (audience: string) => {
    if (!config.audiences.includes(audience)) {
      updateConfig('audiences', [...config.audiences, audience]);
    }
    setAudienceSearch('');
    setShowAudienceDropdown(false);
  };

  const removeAudience = (audience: string) => {
    updateConfig('audiences', config.audiences.filter(a => a !== audience));
  };

  if (!isConnected) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">📊 Google Analytics 4 Integration</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Connect to Google Analytics 4 to fetch live data directly from your GA4 properties
          </p>
          <button
            onClick={handleConnectionToggle}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            🔗 Connect to GA4
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">📊 Google Analytics 4 Data</h2>
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
            ✓ Connected
          </span>
        </div>
        <button
          onClick={handleConnectionToggle}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
        >
          🔌 Disconnect
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-red-600 rounded-full"></div>
            <span className="text-sm font-medium text-red-900">Error Fetching Data</span>
          </div>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* GA4 Datasets Management */}
      {ga4Datasets.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-medium text-gray-900">📊 GA4 Datasets</h3>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
              {ga4Datasets.length} dataset{ga4Datasets.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="space-y-3">
            {ga4Datasets.map((dataset) => (
              <div key={dataset.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={dataset.color}
                      onChange={(e) => updateGA4DatasetColor(dataset.id, e.target.value)}
                      className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={dataset.label}
                      onChange={(e) => updateGA4DatasetLabel(dataset.id, e.target.value)}
                      className="font-medium text-sm bg-transparent border-none outline-none focus:bg-gray-50 px-1 py-1 rounded flex-1"
                    />
                  </div>
                  <button
                    onClick={() => removeGA4Dataset(dataset.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="text-xs text-gray-600 space-y-1">
                  <div>📊 Metrics: {dataset.config.metrics.join(', ')}</div>
                  <div>📏 Dimensions: {dataset.config.dimensions.join(', ')}</div>
                  {dataset.config.segments.length > 0 && (
                    <div>🎯 Segments: {dataset.config.segments.join(', ')}</div>
                  )}
                  <div>📅 Period: {dataset.config.startDate} to {dataset.config.endDate}</div>
                  <div>📈 Data Points: {dataset.data.length}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Property Selection */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Database className="h-4 w-4 text-purple-600" />
          <h3 className="text-sm font-medium text-gray-900">🏢 GA4 Property</h3>
        </div>
        <select
          value={config.propertyId}
          onChange={(e) => updateConfig('propertyId', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a GA4 Property</option>
          {availableProperties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name} ({property.id})
            </option>
          ))}
        </select>
      </div>

      {/* Date Range */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-green-600" />
          <h3 className="text-sm font-medium text-gray-900">📅 Date Range</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={config.startDate}
              onChange={(e) => updateConfig('startDate', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={config.endDate}
              onChange={(e) => updateConfig('endDate', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Dimensions */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4 text-purple-600" />
          <h3 className="text-sm font-medium text-gray-900">📏 Dimensions</h3>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
            {config.dimensions.length} selected
          </span>
        </div>
        
        {/* Selected Dimensions */}
        <div className="flex flex-wrap gap-2 mb-3">
          {config.dimensions.map((dimension) => (
            <span
              key={dimension}
              className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full"
            >
              {dimension}
              <button
                onClick={() => removeDimension(dimension)}
                className="hover:bg-purple-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        {/* Dimension Search */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={dimensionSearch}
              onChange={(e) => {
                setDimensionSearch(e.target.value);
                setShowDimensionDropdown(true);
              }}
              onFocus={() => setShowDimensionDropdown(true)}
              placeholder="Search dimensions..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          {showDimensionDropdown && filteredDimensions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {filteredDimensions.slice(0, 20).map((dimension) => (
                <button
                  key={dimension}
                  onClick={() => addDimension(dimension)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-purple-50 focus:bg-purple-50 focus:outline-none"
                  disabled={config.dimensions.includes(dimension)}
                >
                  <div className="flex items-center justify-between">
                    <span className={config.dimensions.includes(dimension) ? 'text-gray-400' : 'text-gray-900'}>
                      {dimension}
                    </span>
                    {config.dimensions.includes(dimension) && (
                      <span className="text-purple-600 text-xs">✓ Added</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-medium text-gray-900">📊 Metrics</h3>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            {config.metrics.length} selected
          </span>
        </div>
        
        {/* Selected Metrics */}
        <div className="flex flex-wrap gap-2 mb-3">
          {config.metrics.map((metric) => (
            <span
              key={metric}
              className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
            >
              {metric}
              <button
                onClick={() => removeMetric(metric)}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        {/* Metric Search */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={metricSearch}
              onChange={(e) => {
                setMetricSearch(e.target.value);
                setShowMetricDropdown(true);
              }}
              onFocus={() => setShowMetricDropdown(true)}
              placeholder="Search metrics..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {showMetricDropdown && filteredMetrics.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {filteredMetrics.slice(0, 20).map((metric) => (
                <button
                  key={metric}
                  onClick={() => addMetric(metric)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                  disabled={config.metrics.includes(metric)}
                >
                  <div className="flex items-center justify-between">
                    <span className={config.metrics.includes(metric) ? 'text-gray-400' : 'text-gray-900'}>
                      {metric}
                    </span>
                    {config.metrics.includes(metric) && (
                      <span className="text-blue-600 text-xs">✓ Added</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Segments */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4 text-orange-600" />
          <h3 className="text-sm font-medium text-gray-900">🎯 Segments</h3>
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
            {config.segments.length} selected
          </span>
        </div>
        
        {/* Selected Segments */}
        {config.segments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {config.segments.map((segment) => (
              <span
                key={segment}
                className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full"
              >
                {segment}
                <button
                  onClick={() => removeSegment(segment)}
                  className="hover:bg-orange-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Segment Search */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={segmentSearch}
              onChange={(e) => {
                setSegmentSearch(e.target.value);
                setShowSegmentDropdown(true);
              }}
              onFocus={() => setShowSegmentDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && segmentSearch.trim()) {
                  e.preventDefault();
                  addCustomSegment();
                }
              }}
              placeholder="Search segments..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {segmentSearch.trim() && !availableSegments.includes(segmentSearch.trim()) && (
              <button
                onClick={addCustomSegment}
                className="px-3 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors"
                title="Add custom segment"
              >
                + Add Custom
              </button>
            )}
          </div>
          
          {showSegmentDropdown && filteredSegments.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {filteredSegments.map((segment) => (
                <button
                  key={segment}
                  onClick={() => addSegment(segment)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 focus:bg-orange-50 focus:outline-none"
                  disabled={config.segments.includes(segment)}
                >
                  <div className="flex items-center justify-between">
                    <span className={config.segments.includes(segment) ? 'text-gray-400' : 'text-gray-900'}>
                      {segment}
                      {customSegments.includes(segment) && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">Custom</span>
                      )}
                    </span>
                    {config.segments.includes(segment) && (
                      <span className="text-orange-600 text-xs">✓ Added</span>
                    )}
                  </div>
                </button>
              ))}
              {segmentSearch.trim() && !filteredSegments.some(s => s.toLowerCase() === segmentSearch.toLowerCase()) && (
                <div className="border-t border-gray-200">
                  <button
                    onClick={addCustomSegment}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-blue-600"
                  >
                    + Add "{segmentSearch}" as custom segment
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Audiences */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4 text-green-600" />
          <h3 className="text-sm font-medium text-gray-900">👥 Audiences</h3>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
            {config.audiences.length} selected
          </span>
        </div>
        
        {/* Selected Audiences */}
        {config.audiences.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {config.audiences.map((audience) => (
              <span
                key={audience}
                className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full"
              >
                {audience}
                <button
                  onClick={() => removeAudience(audience)}
                  className="hover:bg-green-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Audience Search */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={audienceSearch}
              onChange={(e) => {
                setAudienceSearch(e.target.value);
                setShowAudienceDropdown(true);
              }}
              onFocus={() => setShowAudienceDropdown(true)}
              placeholder="Search audiences..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          {showAudienceDropdown && filteredAudiences.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {filteredAudiences.map((audience) => (
                <button
                  key={audience}
                  onClick={() => addAudience(audience)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 focus:bg-green-50 focus:outline-none"
                  disabled={config.audiences.includes(audience)}
                >
                  <div className="flex items-center justify-between">
                    <span className={config.audiences.includes(audience) ? 'text-gray-400' : 'text-gray-900'}>
                      {audience}
                    </span>
                    {config.audiences.includes(audience) && (
                      <span className="text-green-600 text-xs">✓ Added</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fetch Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleFetchData}
          disabled={loading || config.dimensions.length === 0 || config.metrics.length === 0 || !config.propertyId}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            loading || config.dimensions.length === 0 || config.metrics.length === 0 || !config.propertyId
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
          }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Fetching Data...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              📊 Fetch GA4 Data
            </>
          )}
        </button>

        {lastFetchedData && (
          <div className="text-sm text-gray-600">
            ✅ Last fetch: {lastFetchedData.metadata.rowCount} rows
          </div>
        )}
      </div>

      {/* Configuration Summary */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-600">
          <div className="font-medium mb-1">Current Configuration:</div>
          <div>🏢 Property: {config.propertyId || 'Not selected'}</div>
          <div>📅 {config.startDate} to {config.endDate}</div>
          <div>📏 Dimensions: {config.dimensions.join(', ')}</div>
          <div>📊 Metrics: {config.metrics.join(', ')}</div>
          {config.segments.length > 0 && <div>🎯 Segments: {config.segments.join(', ')}</div>}
          {config.audiences.length > 0 && <div>👥 Audiences: {config.audiences.join(', ')}</div>}
          {customSegments.length > 0 && <div>🔧 Custom Segments: {customSegments.join(', ')}</div>}
          {ga4Datasets.length > 0 && <div>📊 Total GA4 Datasets: {ga4Datasets.length}</div>}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showDimensionDropdown || showMetricDropdown || showSegmentDropdown || showAudienceDropdown) && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => {
            setShowDimensionDropdown(false);
            setShowMetricDropdown(false);
            setShowSegmentDropdown(false);
            setShowAudienceDropdown(false);
          }}
        />
      )}
    </div>
  );
};