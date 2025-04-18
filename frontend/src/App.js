import React, { useState, useEffect } from 'react';
import { 
  Container, Box, Typography, TextField, Button, 
  Checkbox, FormControlLabel, FormGroup, Grid, 
  CircularProgress, Paper, Tabs, Tab, Divider, Alert,
  IconButton, AppBar, Toolbar, TableContainer, Table,
  TableHead, TableBody, TableRow, TableCell, Chip,
  List, ListItem, ListItemAvatar, ListItemText, ListItemSecondaryAction,
  Avatar, Tooltip, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import BugReportIcon from '@mui/icons-material/BugReport';
import ScienceIcon from '@mui/icons-material/Science';
import SearchIcon from '@mui/icons-material/Search';
import GitHubIcon from '@mui/icons-material/GitHub';
import LaunchIcon from '@mui/icons-material/Launch';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import CheckIcon from '@mui/icons-material/Check';

import { searchService, experimentService, debugService } from './services/api';
import BoostExperiment from './components/BoostExperiment';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const APP_VERSION = "1.0.0";
const DEBUG = process.env.REACT_APP_DEBUG === 'true';

function App() {
  // State for search query and options
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [mainTab, setMainTab] = useState(0);
  const [experimentTab, setExperimentTab] = useState(0);
  const [debugTab, setDebugTab] = useState(0);
  const [environmentInfo, setEnvironmentInfo] = useState(null);
  
  // State for source selection
  const [sources, setSources] = useState({
    ads: true,
    scholar: true,
    semanticScholar: true,
    webOfScience: true
  });
  
  // State for similarity metrics selection
  const [metrics, setMetrics] = useState({
    jaccard: true,
    rankBiased: true,
    cosine: false,
    euclidean: false
  });
  
  // State for metadata fields to compare
  const [fields, setFields] = useState({
    title: true,
    abstract: true,
    authors: false,
    doi: true,
    year: false,
    citation_count: true
  });

  // Boost experiment state
  const [boostConfig, setBoostConfig] = useState({
    query: '',
    boost_fields: ['citation_count', 'year'],
    boost_weights: {
      citation_count: 0.2,
      year: 0.4
    },
    max_boost: 1.5
  });
  
  // A/B test state
  const [abTestVariation, setAbTestVariation] = useState('B');

  // Debug state
  const [sourcesList, setSourcesList] = useState(null);
  const [pingResults, setPingResults] = useState({});
  const [testSearchResults, setTestSearchResults] = useState(null);

  // Result tab state
  const [resultTab, setResultTab] = useState(0);
  const [filterText, setFilterText] = useState('');

  // Active source for detailed results
  const [activeSource, setActiveSource] = useState(null);

  // Load environment info on startup
  useEffect(() => {
    const fetchEnvironmentInfo = async () => {
      try {
        const envInfo = await debugService.getEnvironmentInfo();
        if (!envInfo.error) {
          setEnvironmentInfo(envInfo);
        }
      } catch (error) {
        console.error("Failed to fetch environment info:", error);
      }
    };

    if (DEBUG) {
      fetchEnvironmentInfo();
    }
  }, []);

  // Handle source selection changes
  const handleSourceChange = (event) => {
    setSources({
      ...sources,
      [event.target.name]: event.target.checked
    });
  };

  // Handle metrics selection changes
  const handleMetricsChange = (event) => {
    setMetrics({
      ...metrics,
      [event.target.name]: event.target.checked
    });
  };

  // Handle fields selection changes
  const handleFieldsChange = (event) => {
    setFields({
      ...fields,
      [event.target.name]: event.target.checked
    });
  };

  // Handle tab changes
  const handleMainTabChange = (event, newValue) => {
    setMainTab(newValue);
  };

  const handleExperimentTabChange = (event, newValue) => {
    setExperimentTab(newValue);
  };

  const handleDebugTabChange = (event, newValue) => {
    setDebugTab(newValue);
  };

  // Submit the search query
  const handleSearch = async () => {
    if (!query.trim()) {
      setError("Please enter a search query");
      return;
    }
    
    if (!Object.values(sources).some(val => val)) {
      setError("Please select at least one search source");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const selectedSources = Object.keys(sources).filter(key => sources[key]);
      const selectedMetrics = Object.keys(metrics).filter(key => metrics[key]);
      
      // Always include these fields for proper display
      const selectedFields = [
        ...Object.keys(fields).filter(key => fields[key]),
        'abstract',  // Always include abstract
        'citation_count'  // Always include citation_count
      ];
      
      // Remove duplicates
      const uniqueFields = Array.from(new Set(selectedFields));
      
      const requestBody = {
        query,
        sources: selectedSources,
        metrics: selectedMetrics,
        fields: uniqueFields
      };

      if (DEBUG) {
        console.log('Making search request:', requestBody);
      }
      
      const response = await searchService.compareSearchResults(requestBody);
      
      if (response.error) {
        setError(response.message);
      } else {
        setResults(response);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(`Failed to fetch results: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Run boost experiment
  const handleRunBoostExperiment = async () => {
    if (!boostConfig.query.trim()) {
      setError("Please enter a query for the boost experiment");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (DEBUG) {
        console.log('Running boost experiment with config:', boostConfig);
      }
      
      const response = await experimentService.runBoostExperiment(boostConfig);
      
      if (response.error) {
        setError(response.message);
      } else {
        // Set results in a format that can be displayed
        setResults({
          type: 'boost',
          ...response
        });
      }
    } catch (err) {
      console.error('Boost experiment error:', err);
      setError(`Failed to run boost experiment: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Run A/B test
  const handleRunAbTest = async () => {
    if (!query.trim()) {
      setError("Please enter a search query for the A/B test");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const selectedSources = Object.keys(sources).filter(key => sources[key]);
      const selectedMetrics = Object.keys(metrics).filter(key => metrics[key]);
      const selectedFields = Object.keys(fields).filter(key => fields[key]);
      
      const requestBody = {
        query,
        sources: selectedSources,
        metrics: selectedMetrics,
        fields: selectedFields
      };

      if (DEBUG) {
        console.log('Running A/B test with config:', requestBody, 'Variation:', abTestVariation);
      }
      
      const response = await experimentService.runAbTest(requestBody, abTestVariation);
      
      if (response.error) {
        setError(response.message);
      } else {
        // Set results in a format that can be displayed
        setResults({
          type: 'abTest',
          ...response
        });
      }
    } catch (err) {
      console.error('A/B test error:', err);
      setError(`Failed to run A/B test: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // List sources for debug
  const handleListSources = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await debugService.listSources();
      
      if (response.error) {
        setError(response.message);
      } else {
        setSourcesList(response);
      }
    } catch (err) {
      console.error('List sources error:', err);
      setError(`Failed to list sources: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Ping source for debug
  const handlePingSource = async (source) => {
    setLoading(true);
    setError(null);
    
    try {
      setPingResults({
        ...pingResults,
        [source]: { loading: true }
      });
      
      const response = await debugService.pingSource(source);
      
      if (response.error) {
        setPingResults({
          ...pingResults,
          [source]: { error: response.message }
        });
      } else {
        setPingResults({
          ...pingResults,
          [source]: response
        });
      }
    } catch (err) {
      console.error(`Ping source ${source} error:`, err);
      setPingResults({
        ...pingResults,
        [source]: { error: err.message }
      });
    } finally {
      setLoading(false);
    }
  };

  // Test search for debug
  const handleTestSearch = async (source) => {
    if (!query.trim()) {
      setError("Please enter a search query for testing");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await debugService.testSearch(source, query);
      
      if (response.error) {
        setError(response.message);
      } else {
        setTestSearchResults(response);
      }
    } catch (err) {
      console.error('Test search error:', err);
      setError(`Failed to test search: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Format source name for display
  const formatSourceName = (source) => {
    switch(source) {
      case 'ads':
        return 'ADS/SciX';
      case 'scholar':
        return 'Google Scholar';
      case 'webOfScience':
        return 'Web of Science';
      case 'semanticScholar':
        return 'Semantic Scholar';
      default:
        return source.charAt(0).toUpperCase() + source.slice(1);
    }
  };

  // Format metric name for display
  const formatMetricName = (metric) => {
    switch(metric) {
      case 'jaccard':
        return 'Jaccard Similarity';
      case 'rankBiased':
      case 'rank_biased':
        return 'Rank-Biased Overlap';
      case 'cosine':
        return 'Cosine Similarity';
      case 'euclidean':
        return 'Euclidean Distance';
      default:
        return metric.replace(/_/g, ' ').split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
  };

  // Helper function to get metric description
  const getMetricDescription = (metric) => {
    switch(metric) {
      case 'jaccard':
        return 'Measures the similarity between finite sample sets, and is defined as the size of the intersection divided by the size of the union of the sample sets.';
      case 'rankBiased':
      case 'rank_biased':
        return 'Rank-Biased Overlap (RBO) measures the similarity between two ranked lists, weighting items towards the top of the lists more heavily.';
      case 'cosine':
        return 'Measures the cosine of the angle between two vectors, representing how similar the two vectors are irrespective of their size.';
      case 'euclidean':
        return 'Measures the straight-line distance between two points in Euclidean space.';
      default:
        return 'No description available for this metric.';
    }
  };

  // Add a new function to handle running a new search with custom weights
  const handleRunNewSearchWithWeights = async (transformedQuery, boostConfig) => {
    if (!transformedQuery.trim()) {
      setError("Please enter a search query");
      return Promise.reject(new Error("Empty query"));
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const selectedSources = Object.keys(sources).filter(key => sources[key]);
      const selectedMetrics = Object.keys(metrics).filter(key => metrics[key]);
      
      // Always include these fields for proper display
      const selectedFields = [
        ...Object.keys(fields).filter(key => fields[key]),
        'abstract',  // Always include abstract
        'citation_count'  // Always include citation_count
      ];
      
      // Remove duplicates
      const uniqueFields = Array.from(new Set(selectedFields));
      
      const requestBody = {
        query: transformedQuery, // Use the transformed query with field weights
        sources: selectedSources,
        metrics: selectedMetrics,
        fields: uniqueFields,
        originalQuery: query, // Include the original query for reference
        useTransformedQuery: true // Flag to indicate this is a transformed query
      };

      if (DEBUG) {
        console.log('Making search request with transformed query:', requestBody);
      }
      
      const response = await searchService.compareSearchResults(requestBody);
      
      if (response.error) {
        setError(response.message);
        return Promise.reject(new Error(response.message));
      } else {
        setResults(response);
        return Promise.resolve(response);
      }
    } catch (err) {
      console.error('Search error:', err);
      const errorMessage = `Failed to fetch results: ${err.message}`;
      setError(errorMessage);
      return Promise.reject(new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <SearchIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Academic Search Engine Comparisons
          </Typography>
          {environmentInfo && (
            <Typography variant="caption" component="div" sx={{ mr: 2 }}>
              {environmentInfo.environment} v{APP_VERSION}
            </Typography>
          )}
          <IconButton 
            color="inherit" 
            href="https://github.com/adsabs/search-comparisons" 
            target="_blank"
            aria-label="GitHub repository"
          >
            <GitHubIcon />
          </IconButton>
        </Toolbar>
        <Tabs 
          value={mainTab} 
          onChange={handleMainTabChange}
          variant="fullWidth"
          textColor="inherit"
          indicatorColor="secondary"
        >
          <Tab icon={<SearchIcon />} label="SEARCH" id="tab-0" />
          <Tab icon={<ScienceIcon />} label="EXPERIMENTS" id="tab-1" />
          <Tab icon={<BugReportIcon />} label="DEBUG" id="tab-2" />
          <Tab icon={<InfoIcon />} label="ABOUT" id="tab-3" />
        </Tabs>
      </AppBar>

      <Container maxWidth="lg">
        {/* Alert for errors */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Search Tab */}
        {mainTab === 0 && (
          <Box my={4}>
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Box component="form" noValidate autoComplete="off">
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Search Query"
                      variant="outlined"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Enter your academic search query"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle1">Search Sources</Typography>
                    <FormGroup>
                      <FormControlLabel
                        control={<Checkbox checked={sources.ads} onChange={handleSourceChange} name="ads" />}
                        label="ADS/SciX"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={sources.scholar} onChange={handleSourceChange} name="scholar" />}
                        label="Google Scholar"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={sources.semanticScholar} onChange={handleSourceChange} name="semanticScholar" />}
                        label="Semantic Scholar"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={sources.webOfScience} onChange={handleSourceChange} name="webOfScience" />}
                        label="Web of Science"
                      />
                    </FormGroup>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle1">Similarity Metrics</Typography>
                    <FormGroup>
                      <FormControlLabel
                        control={<Checkbox checked={metrics.jaccard} onChange={handleMetricsChange} name="jaccard" />}
                        label="Jaccard Similarity"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={metrics.rankBiased} onChange={handleMetricsChange} name="rankBiased" />}
                        label="Rank-Biased Overlap"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={metrics.cosine} onChange={handleMetricsChange} name="cosine" />}
                        label="Cosine Similarity"
                      />
                    </FormGroup>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle1">Metadata Fields</Typography>
                    <FormGroup>
                      <FormControlLabel
                        control={<Checkbox checked={fields.title} onChange={handleFieldsChange} name="title" />}
                        label="Title"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={fields.abstract} onChange={handleFieldsChange} name="abstract" />}
                        label="Abstract"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={fields.authors} onChange={handleFieldsChange} name="authors" />}
                        label="Authors"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={fields.doi} onChange={handleFieldsChange} name="doi" />}
                        label="DOI"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={fields.year} onChange={handleFieldsChange} name="year" />}
                        label="Publication Year"
                      />
                      <FormControlLabel
                        control={<Checkbox checked={fields.citation_count} onChange={handleFieldsChange} name="citation_count" />}
                        label="Citation Count"
                      />
                    </FormGroup>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSearch}
                      disabled={loading}
                      fullWidth
                    >
                      {loading ? <CircularProgress size={24} /> : "Compare Search Results"}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Paper>

            {/* Search Results would be displayed here */}
            {results && results.type !== 'boost' && results.type !== 'abTest' && (
              <Box mt={4}>
                <Typography variant="h5" gutterBottom>
                  Search Results
                </Typography>
                
                {Object.keys(results.results).length > 0 ? (
                  <Box>
                    <Paper elevation={3} sx={{ mb: 3 }}>
                      <Tabs 
                        value={resultTab || 0} 
                        onChange={(e, newValue) => setResultTab(newValue)}
                        variant="fullWidth"
                      >
                        <Tab label="Results Table" />
                        <Tab label="Comparison" />
                        <Tab label="Visualization" />
                        <Tab label="Boost Experiments" />
                      </Tabs>
                      
                      <Box sx={{ p: 3 }}>
                        {/* Results Table Tab */}
                        {resultTab === 0 && (
                          <Box>
                            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="subtitle1">
                                Showing results for: <strong>{results.query}</strong>
                              </Typography>
                              <TextField
                                size="small"
                                variant="outlined"
                                placeholder="Filter results..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                sx={{ width: 250 }}
                              />
                            </Box>
                            
                            {/* Side by Side Grid Layout */}
                            <Grid container spacing={2}>
                              {Object.keys(results.results).map(source => {
                                const sourceResults = results.results[source];
                                const filteredResults = filterText
                                  ? sourceResults.filter(result => 
                                      result.title.toLowerCase().includes(filterText.toLowerCase()) ||
                                      (result.abstract && result.abstract.toLowerCase().includes(filterText.toLowerCase())) ||
                                      (result.authors && result.authors.some(author => 
                                        author && author.toLowerCase().includes(filterText.toLowerCase())
                                      ))
                                    )
                                  : sourceResults;
                                  
                                return (
                                  <Grid item xs={12} md={6} xl={3} key={source}>
                                    <Paper 
                                      elevation={3} 
                                      sx={{ 
                                        height: { xs: 400, md: 600 }, 
                                        display: 'flex', 
                                        flexDirection: 'column' 
                                      }}
                                    >
                                      <Box sx={{ 
                                        p: 1, 
                                        bgcolor: 
                                          source === 'ads' ? 'primary.main' :
                                          source === 'scholar' ? 'error.main' :
                                          source === 'semanticScholar' ? 'warning.main' : 'success.main',
                                        color: 'white',
                                        borderTopLeftRadius: 4,
                                        borderTopRightRadius: 4,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 1
                                      }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                          {formatSourceName(source)}
                                        </Typography>
                                        <Chip 
                                          label={`${filteredResults.length} results`}
                                          size="small"
                                          sx={{ 
                                            bgcolor: 'rgba(255,255,255,0.2)', 
                                            color: 'white',
                                            '& .MuiChip-label': { fontWeight: 'bold' }
                                          }} 
                                        />
                                      </Box>
                                      
                                      <Box sx={{ 
                                        flexGrow: 1, 
                                        overflow: 'auto', 
                                        maxHeight: { xs: 'calc(400px - 48px)', md: 'calc(600px - 48px)' }
                                      }}>
                                        <List disablePadding>
                                          {filteredResults.map((result, idx) => (
                                            <Tooltip
                                              key={idx}
                                              title={
                                                <Box sx={{ p: 1, maxWidth: 400 }}>
                                                  {/* Title */}
                                                  <Typography variant="subtitle2" gutterBottom>
                                                    {result.title}
                                                  </Typography>
                                                  
                                                  <Divider sx={{ my: 1 }} />
                                                  
                                                  {/* Key metadata in a single line */}
                                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                                                    {result.year && (
                                                      <Chip 
                                                        size="small" 
                                                        label={`Year: ${result.year}`} 
                                                        sx={{ fontSize: '0.7rem' }}
                                                      />
                                                    )}
                                                    {(result.citation_count !== undefined && result.citation_count !== null) && (
                                                      <Chip 
                                                        size="small" 
                                                        label={`Citations: ${result.citation_count}`} 
                                                        sx={{ fontSize: '0.7rem' }}
                                                      />
                                                    )}
                                                    {result.doi && (
                                                      <Chip 
                                                        size="small" 
                                                        label={`DOI: ${result.doi.substring(0, 15)}...`} 
                                                        sx={{ fontSize: '0.7rem' }}
                                                      />
                                                    )}
                                                  </Box>
                                                  
                                                  {/* Authors - condensed */}
                                                  {result.authors && result.authors.length > 0 && (
                                                    <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                                                      <strong>Authors:</strong> {Array.isArray(result.authors) 
                                                        ? result.authors.slice(0, 3).join(', ') + (result.authors.length > 3 ? ', et al.' : '')
                                                        : result.authors}
                                                    </Typography>
                                                  )}
                                                  
                                                  {/* Abstract snippet */}
                                                  {result.abstract && (
                                                    <Typography variant="caption" sx={{ display: 'block' }}>
                                                      <strong>Abstract:</strong> {result.abstract.length > 300 
                                                        ? `${result.abstract.substring(0, 300)}...` 
                                                        : result.abstract}
                                                    </Typography>
                                                  )}
                                                </Box>
                                              }
                                              arrow
                                              placement="right"
                                              componentsProps={{
                                                tooltip: {
                                                  sx: { bgcolor: 'background.paper', color: 'text.primary', boxShadow: 3 }
                                                }
                                              }}
                                            >
                                              <ListItem 
                                                divider 
                                                sx={{ 
                                                  '&:hover': { bgcolor: 'action.hover' },
                                                  px: 2, 
                                                  py: 1,
                                                  minHeight: 80,
                                                  maxHeight: 110
                                                }}
                                                secondaryAction={
                                                  result.url && (
                                                    <IconButton 
                                                      size="small" 
                                                      href={result.url} 
                                                      target="_blank" 
                                                      aria-label="View source"
                                                      sx={{ ml: 1 }}
                                                    >
                                                      <LaunchIcon fontSize="small" />
                                                    </IconButton>
                                                  )
                                                }
                                              >
                                                <ListItemText
                                                  disableTypography
                                                  primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                                      <Chip 
                                                        label={result.rank} 
                                                        size="small" 
                                                        sx={{ 
                                                          mr: 1, 
                                                          minWidth: 28,
                                                          height: 20,
                                                          bgcolor: 
                                                            source === 'ads' ? 'primary.light' :
                                                            source === 'scholar' ? 'error.light' :
                                                            source === 'semanticScholar' ? 'warning.light' : 'success.light',
                                                        }} 
                                                      />
                                                      <Typography 
                                                        variant="body2" 
                                                        sx={{ 
                                                          fontWeight: 'medium',
                                                          display: '-webkit-box',
                                                          WebkitLineClamp: 2,
                                                          WebkitBoxOrient: 'vertical',
                                                          overflow: 'hidden',
                                                          lineHeight: 1.2,
                                                          mb: 0.5
                                                        }}
                                                      >
                                                        {result.title}
                                                      </Typography>
                                                    </Box>
                                                  }
                                                  secondary={
                                                    <Box sx={{ mt: 0.5 }}>
                                                      {/* Authors + Year */}
                                                      <Typography 
                                                        variant="caption" 
                                                        sx={{ 
                                                          display: 'block',
                                                          color: 'text.secondary',
                                                          whiteSpace: 'nowrap',
                                                          overflow: 'hidden',
                                                          textOverflow: 'ellipsis'
                                                        }}
                                                      >
                                                        {Array.isArray(result.authors) 
                                                          ? result.authors.slice(0, 2).join(', ') + (result.authors.length > 2 ? ', et al.' : '') 
                                                          : result.authors}
                                                        {result.year ? ` (${result.year})` : ''}
                                                      </Typography>
                                                      
                                                      {/* Abstract preview */}
                                                      {result.abstract && (
                                                        <Typography 
                                                          variant="caption" 
                                                          sx={{ 
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 1,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden',
                                                            color: 'text.secondary',
                                                            lineHeight: 1.2,
                                                            mt: 0.5
                                                          }}
                                                        >
                                                          {result.abstract}
                                                        </Typography>
                                                      )}
                                                      
                                                      {/* Citations as a small indicator in bottom right */}
                                                      {(result.citation_count !== undefined && result.citation_count !== null) && (
                                                        <Box sx={{ 
                                                          display: 'flex', 
                                                          justifyContent: 'flex-end',
                                                          mt: 0.5  
                                                        }}>
                                                          <Chip
                                                            size="small"
                                                            label={`Cited: ${result.citation_count}`}
                                                            sx={{ 
                                                              height: 16,
                                                              fontSize: '0.6rem',
                                                              '& .MuiChip-label': { px: 0.8 }
                                                            }}
                                                          />
                                                        </Box>
                                                      )}
                                                    </Box>
                                                  }
                                                />
                                              </ListItem>
                                            </Tooltip>
                                          ))}
                                        </List>
                                      </Box>
                                    </Paper>
                                  </Grid>
                                );
                              })}
                            </Grid>
                          </Box>
                        )}
                        
                        {/* Comparison Tab */}
                        {resultTab === 1 && (
                          <Box>
                            <Grid container spacing={3}>
                              {/* Summary Stats */}
                              <Grid item xs={12}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 3 }}>
                                  <Paper elevation={2} sx={{ p: 2, minWidth: 160, textAlign: 'center' }}>
                                    <Typography variant="h4" color="primary">
                                      {Object.keys(results.results).length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      Total Sources
                                    </Typography>
                                  </Paper>
                                  
                                  <Paper elevation={2} sx={{ p: 2, minWidth: 160, textAlign: 'center' }}>
                                    <Typography variant="h4" color="primary">
                                      {Object.values(results.results).reduce((acc, val) => acc + val.length, 0)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      Total Results
                                    </Typography>
                                  </Paper>
                                  
                                  {results.comparison && results.comparison.similarity && (
                                    <Paper elevation={2} sx={{ p: 2, minWidth: 160, textAlign: 'center' }}>
                                      <Typography variant="h4" color="primary">
                                        {Object.keys(results.comparison.similarity).length}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        Metrics Computed
                                      </Typography>
                                    </Paper>
                                  )}
                                </Box>
                              </Grid>
                              
                              {/* Metrics Table */}
                              {results.comparison && results.comparison.overlap && Object.keys(results.comparison.overlap).length > 0 && (
                                <Grid item xs={12}>
                                  <Paper elevation={2} sx={{ p: 2 }}>
                                    <Typography variant="h6" color="primary" gutterBottom>
                                      Similarity Metrics
                                    </Typography>
                                    
                                    {/* Metrics explanation */}
                                    <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #eee' }}>
                                      <Typography variant="subtitle2" gutterBottom>
                                        Understanding the Metrics:
                                      </Typography>
                                      <Typography variant="body2">
                                        <strong>Overlap:</strong> Records are matched by DOI (when available) or by title. The total shows unique matching papers.
                                      </Typography>
                                      <Typography variant="body2">
                                        <strong>Same Rank:</strong> Papers that appear at the same rank position in both source results (e.g., paper appears as #3 in both sources).
                                      </Typography>
                                      <Typography variant="body2">
                                        <strong>Jaccard Similarity:</strong> Measures overlap regardless of ranking - number of shared records divided by total unique records from both sources.
                                      </Typography>
                                      <Typography variant="body2">
                                        <strong>Rank-Biased Overlap:</strong> Measures similarity considering the ranking of results, giving more weight to matches at higher positions.
                                      </Typography>
                                    </Box>
                                    
                                    <TableContainer>
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell>Sources</TableCell>
                                            <TableCell align="center">Total Overlap</TableCell>
                                            <TableCell align="center">Breakdown</TableCell>
                                            <TableCell align="center">Same Rank</TableCell>
                                            <TableCell align="right">
                                              <Tooltip title={getMetricDescription('jaccard')}>
                                                <Typography variant="body2" display="inline" sx={{ cursor: 'help', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                                                  Jaccard Similarity
                                                </Typography>
                                              </Tooltip>
                                            </TableCell>
                                            <TableCell align="right">
                                              <Tooltip title={getMetricDescription('rankBiased')}>
                                                <Typography variant="body2" display="inline" sx={{ cursor: 'help', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                                                  Rank-Biased Overlap
                                                </Typography>
                                              </Tooltip>
                                            </TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {Object.entries(results.comparison.overlap).map(([key, stats]) => {
                                            const [source1, source2] = key.split('_vs_');
                                            const sourceNames = [formatSourceName(source1), formatSourceName(source2)];
                                            const comparisonLabel = `${sourceNames[0]} vs ${sourceNames[1]}`;
                                            
                                            // Calculate metrics
                                            const jaccardValue = results.comparison.similarity?.jaccard?.[key];
                                            const rankBiasedValue = results.comparison.similarity?.rankBiased?.[key];
                                            
                                            const doiMatches = stats.matching_dois?.length || 0;
                                            const titleMatches = stats.all_matching_titles?.length || 0;
                                            const sameRankCount = stats.same_rank_count || 0;
                                            
                                            return (
                                              <TableRow key={key}>
                                                <TableCell>{comparisonLabel}</TableCell>
                                                <TableCell align="center">
                                                  <Chip 
                                                    label={stats.overlap}
                                                    size="small" 
                                                    color="success"
                                                    sx={{ fontWeight: 'bold' }}
                                                  />
                                                </TableCell>
                                                <TableCell align="center">
                                                  <Typography variant="caption">
                                                    {doiMatches} by DOI, {titleMatches} by title
                                                  </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                  <Tooltip title="Papers that appear at the same rank position in both sources">
                                                    <Chip 
                                                      label={sameRankCount}
                                                      size="small" 
                                                      color="info"
                                                      sx={{ fontWeight: 'bold' }}
                                                    />
                                                  </Tooltip>
                                                </TableCell>
                                                <TableCell align="right">
                                                  <strong>{jaccardValue !== undefined ? jaccardValue.toFixed(4) : '0.0000'}</strong>
                                                </TableCell>
                                                <TableCell align="right">
                                                  <strong>{rankBiasedValue !== undefined ? rankBiasedValue.toFixed(4) : '0.0000'}</strong>
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                  </Paper>
                                </Grid>
                              )}
                            </Grid>
                          </Box>
                        )}

                        {/* Visualization Tab */}
                        {resultTab === 2 && (
                          <Box sx={{ p: 2 }}>
                            {results && results.comparison && results.comparison.similarity && (
                              <Box>
                                <Typography variant="h6" gutterBottom>
                                  Similarity Metrics Visualization
                                </Typography>
                                
                                <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    About this visualization:
                                  </Typography>
                                  <Typography variant="body2">
                                    These bar charts show the Jaccard similarity and Rank-Biased Overlap (RBO) metrics between ADS/SciX and other search engines.
                                    Higher values indicate greater similarity between result sets.
                                  </Typography>
                                  <Alert severity="info" sx={{ mt: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                      Current Query: <strong>{results.query}</strong>
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                      In future versions, multiple queries will be displayed with different patterns to identify trends in search engine behavior across query types.
                                    </Typography>
                                  </Alert>
                                </Paper>

                                {/* Jaccard Similarity Bar Chart */}
                                <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                                  <Typography variant="subtitle1" gutterBottom color="primary">
                                    Jaccard Similarity
                                  </Typography>
                                  <Typography variant="body2" sx={{ mb: 2 }}>
                                    Jaccard similarity measures the proportion of shared results regardless of ranking position.
                                  </Typography>
                                  
                                  <Box sx={{ height: 300, position: 'relative', border: '1px solid #eee', borderRadius: 1, p: 2, mb: 2 }}>
                                    {/* Y-axis */}
                                    <Box sx={{ 
                                      position: 'absolute', 
                                      left: 0, 
                                      top: 0, 
                                      bottom: 0, 
                                      width: 50, 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'flex-end', 
                                      pr: 1,
                                      borderRight: '1px solid #eee' 
                                    }}>
                                      <Typography variant="caption">1.0</Typography>
                                      <Typography variant="caption">0.8</Typography>
                                      <Typography variant="caption">0.6</Typography>
                                      <Typography variant="caption">0.4</Typography>
                                      <Typography variant="caption">0.2</Typography>
                                      <Typography variant="caption">0.0</Typography>
                                    </Box>
                                    
                                    {/* X-axis labels */}
                                    <Box sx={{ position: 'absolute', left: 50, right: 0, bottom: 0, height: 20, display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                                      <Typography variant="caption">ADS vs Google Scholar</Typography>
                                      <Typography variant="caption">ADS vs Semantic Scholar</Typography>
                                      <Typography variant="caption">ADS vs Web of Science</Typography>
                                    </Box>
                                    
                                    {/* Grid lines */}
                                    <Box sx={{ position: 'absolute', left: 50, right: 0, top: 0, bottom: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                      {[0, 0.2, 0.4, 0.6, 0.8, 1].map((line) => (
                                        <Box key={line} sx={{ borderBottom: line < 1 ? '1px dashed #ddd' : 'none', width: '100%', height: 0 }} />
                                      ))}
                                    </Box>
                                    
                                    {/* Bar Chart area */}
                                    <Box sx={{ position: 'absolute', left: 50, right: 0, top: 0, bottom: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around' }}>
                                      {/* Process data for bar chart */}
                                      {(() => {
                                        // Define the comparison pairs we want to show
                                        const comparisonPairs = [
                                          { key: 'ads_vs_scholar', label: 'ADS vs Google Scholar', color: 'error.main' },
                                          { key: 'ads_vs_semanticScholar', label: 'ADS vs Semantic Scholar', color: 'warning.main' },
                                          { key: 'ads_vs_webOfScience', label: 'ADS vs Web of Science', color: 'success.main' }
                                        ];
                                        
                                        return comparisonPairs.map(pair => {
                                          // Handle both directions (ads_vs_x or x_vs_ads)
                                          const alt1 = pair.key;
                                          const alt2 = pair.key.split('_vs_').reverse().join('_vs_');
                                          
                                          // Get value from either direction
                                          const value = results.comparison.similarity.jaccard?.[alt1] || 
                                                       results.comparison.similarity.jaccard?.[alt2] || 
                                                       0;
                                          
                                          // Calculate bar height based on value
                                          const barHeight = `${value * 100}%`;
                                          
                                          return (
                                            <Tooltip
                                              key={pair.key}
                                              title={`${pair.label}: ${value.toFixed(4)} (Query: "${results.query}")`}
                                              placement="top"
                                            >
                                              <Box
                                                sx={{
                                                  width: '20%',
                                                  height: barHeight,
                                                  bgcolor: pair.color,
                                                  borderRadius: '4px 4px 0 0',
                                                  transition: 'transform 0.2s',
                                                  cursor: 'pointer',
                                                  '&:hover': {
                                                    transform: 'scaleY(1.05)',
                                                    filter: 'brightness(1.1)'
                                                  }
                                                }}
                                              />
                                            </Tooltip>
                                          );
                                        });
                                      })()}
                                    </Box>
                                  </Box>
                                  
                                  {/* Legend */}
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', mt: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Box sx={{ width: 16, height: 10, bgcolor: 'error.main', mr: 1 }} />
                                      <Typography variant="caption">ADS vs Google Scholar</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Box sx={{ width: 16, height: 10, bgcolor: 'warning.main', mr: 1 }} />
                                      <Typography variant="caption">ADS vs Semantic Scholar</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Box sx={{ width: 16, height: 10, bgcolor: 'success.main', mr: 1 }} />
                                      <Typography variant="caption">ADS vs Web of Science</Typography>
                                    </Box>
                                  </Box>
                                </Paper>
                                
                                {/* Rank-Biased Overlap Bar Chart */}
                                <Paper elevation={2} sx={{ p: 2 }}>
                                  <Typography variant="subtitle1" gutterBottom color="primary">
                                    Rank-Biased Overlap
                                  </Typography>
                                  <Typography variant="body2" sx={{ mb: 2 }}>
                                    Rank-Biased Overlap considers the order of results, giving higher weight to matches at the top of result lists.
                                  </Typography>
                                  
                                  <Box sx={{ height: 300, position: 'relative', border: '1px solid #eee', borderRadius: 1, p: 2, mb: 2 }}>
                                    {/* Y-axis */}
                                    <Box sx={{ 
                                      position: 'absolute', 
                                      left: 0, 
                                      top: 0, 
                                      bottom: 0, 
                                      width: 50, 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'flex-end', 
                                      pr: 1,
                                      borderRight: '1px solid #eee' 
                                    }}>
                                      <Typography variant="caption">1.0</Typography>
                                      <Typography variant="caption">0.8</Typography>
                                      <Typography variant="caption">0.6</Typography>
                                      <Typography variant="caption">0.4</Typography>
                                      <Typography variant="caption">0.2</Typography>
                                      <Typography variant="caption">0.0</Typography>
                                    </Box>
                                    
                                    {/* X-axis labels */}
                                    <Box sx={{ position: 'absolute', left: 50, right: 0, bottom: 0, height: 20, display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                                      <Typography variant="caption">ADS vs Google Scholar</Typography>
                                      <Typography variant="caption">ADS vs Semantic Scholar</Typography>
                                      <Typography variant="caption">ADS vs Web of Science</Typography>
                                    </Box>
                                    
                                    {/* Grid lines */}
                                    <Box sx={{ position: 'absolute', left: 50, right: 0, top: 0, bottom: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                      {[0, 0.2, 0.4, 0.6, 0.8, 1].map((line) => (
                                        <Box key={line} sx={{ borderBottom: line < 1 ? '1px dashed #ddd' : 'none', width: '100%', height: 0 }} />
                                      ))}
                                    </Box>
                                    
                                    {/* Bar Chart area */}
                                    <Box sx={{ position: 'absolute', left: 50, right: 0, top: 0, bottom: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around' }}>
                                      {/* Process data for bar chart */}
                                      {(() => {
                                        // Define the comparison pairs we want to show
                                        const comparisonPairs = [
                                          { key: 'ads_vs_scholar', label: 'ADS vs Google Scholar', color: 'error.main' },
                                          { key: 'ads_vs_semanticScholar', label: 'ADS vs Semantic Scholar', color: 'warning.main' },
                                          { key: 'ads_vs_webOfScience', label: 'ADS vs Web of Science', color: 'success.main' }
                                        ];
                                        
                                        return comparisonPairs.map(pair => {
                                          // Handle both directions (ads_vs_x or x_vs_ads)
                                          const alt1 = pair.key;
                                          const alt2 = pair.key.split('_vs_').reverse().join('_vs_');
                                          
                                          // Get value from either direction
                                          const value = results.comparison.similarity.rankBiased?.[alt1] || 
                                                       results.comparison.similarity.rankBiased?.[alt2] || 
                                                       0;
                                          
                                          // Calculate bar height based on value
                                          const barHeight = `${value * 100}%`;
                                          
                                          return (
                                            <Tooltip
                                              key={pair.key}
                                              title={`${pair.label}: ${value.toFixed(4)} (Query: "${results.query}")`}
                                              placement="top"
                                            >
                                              <Box
                                                sx={{
                                                  width: '20%',
                                                  height: barHeight,
                                                  bgcolor: pair.color,
                                                  borderRadius: '4px 4px 0 0',
                                                  transition: 'transform 0.2s',
                                                  cursor: 'pointer',
                                                  '&:hover': {
                                                    transform: 'scaleY(1.05)',
                                                    filter: 'brightness(1.1)'
                                                  }
                                                }}
                                              />
                                            </Tooltip>
                                          );
                                        });
                                      })()}
                                    </Box>
                                  </Box>
                                  
                                  {/* Legend */}
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', mt: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Box sx={{ width: 16, height: 10, bgcolor: 'error.main', mr: 1 }} />
                                      <Typography variant="caption">ADS vs Google Scholar</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Box sx={{ width: 16, height: 10, bgcolor: 'warning.main', mr: 1 }} />
                                      <Typography variant="caption">ADS vs Semantic Scholar</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Box sx={{ width: 16, height: 10, bgcolor: 'success.main', mr: 1 }} />
                                      <Typography variant="caption">ADS vs Web of Science</Typography>
                                    </Box>
                                  </Box>
                                </Paper>
                              </Box>
                            )}
                            
                            {(!results || !results.comparison || !results.comparison.similarity) && (
                              <Box sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                  No data to visualize
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Run a search across multiple sources to see similarity metrics visualized here.
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        )}

                        {/* Boost Experiments Tab */}
                        {resultTab === 3 && (
                          <Box>
                            <Typography variant="h6" gutterBottom>
                              Boost Experiment
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                              Apply configurable boost factors to search results based on citation count, publication year, document type, and more.
                              See how different boost configurations affect the ranking of results.
                            </Typography>
                            <BoostExperiment 
                              originalResults={Object.values(results.results)[0] || []} 
                              query={results.query} 
                              API_URL={API_URL}
                              onRunNewSearch={handleRunNewSearchWithWeights}  // Pass the new function
                            />
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Box>
                ) : (
                  <Alert severity="info">No results found for the given query and sources.</Alert>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Experiments Tab */}
        {mainTab === 1 && (
          <Box my={4}>
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Tabs
                value={experimentTab}
                onChange={handleExperimentTabChange}
                variant="fullWidth"
                textColor="primary"
                indicatorColor="primary"
              >
                <Tab label="Boost Search Results" id="exp-tab-0" />
                <Tab label="A/B Testing" id="exp-tab-1" />
                <Tab label="Log Analysis" id="exp-tab-2" />
              </Tabs>

              {/* Boost Experiment */}
              {experimentTab === 0 && (
                <Box mt={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Search Query"
                        variant="outlined"
                        value={boostConfig.query}
                        onChange={(e) => setBoostConfig({...boostConfig, query: e.target.value})}
                        placeholder="Enter query for boost experiment"
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle1">Boost Fields</Typography>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={boostConfig.boost_fields.includes('citation_count')} 
                              onChange={(e) => {
                                const fields = e.target.checked 
                                  ? [...boostConfig.boost_fields, 'citation_count']
                                  : boostConfig.boost_fields.filter(f => f !== 'citation_count');
                                setBoostConfig({...boostConfig, boost_fields: fields});
                              }} 
                            />
                          }
                          label="Citation Count"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={boostConfig.boost_fields.includes('year')} 
                              onChange={(e) => {
                                const fields = e.target.checked 
                                  ? [...boostConfig.boost_fields, 'year']
                                  : boostConfig.boost_fields.filter(f => f !== 'year');
                                setBoostConfig({...boostConfig, boost_fields: fields});
                              }} 
                            />
                          }
                          label="Publication Year"
                        />
                      </FormGroup>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle1">Boost Weights and Limits</Typography>
                      <Box mt={2}>
                        <TextField
                          label="Citation Count Weight"
                          type="number"
                          InputProps={{ inputProps: { min: 0, max: 1, step: 0.1 } }}
                          value={boostConfig.boost_weights.citation_count}
                          onChange={(e) => setBoostConfig({
                            ...boostConfig, 
                            boost_weights: {
                              ...boostConfig.boost_weights,
                              citation_count: Number(e.target.value)
                            }
                          })}
                          sx={{ mr: 2 }}
                        />
                        <TextField
                          label="Year Weight"
                          type="number"
                          InputProps={{ inputProps: { min: 0, max: 1, step: 0.1 } }}
                          value={boostConfig.boost_weights.year}
                          onChange={(e) => setBoostConfig({
                            ...boostConfig, 
                            boost_weights: {
                              ...boostConfig.boost_weights,
                              year: Number(e.target.value)
                            }
                          })}
                        />
                      </Box>
                      <Box mt={2}>
                        <TextField
                          label="Maximum Boost Factor"
                          type="number"
                          InputProps={{ inputProps: { min: 1, max: 10, step: 0.5 } }}
                          value={boostConfig.max_boost}
                          onChange={(e) => setBoostConfig({
                            ...boostConfig,
                            max_boost: Number(e.target.value)
                          })}
                        />
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleRunBoostExperiment}
                        disabled={loading}
                        fullWidth
                      >
                        {loading ? <CircularProgress size={24} /> : "Run Boost Experiment"}
                      </Button>
                    </Grid>
                  </Grid>

                  {/* Boost Results would be displayed here */}
                  {results && results.type === 'boost' && (
                    <Box mt={4}>
                      <Typography variant="h5" gutterBottom>
                        Boost Experiment Results
                      </Typography>
                      <Paper elevation={2} sx={{ p: 2 }}>
                        <pre>{JSON.stringify(results, null, 2)}</pre>
                      </Paper>
                    </Box>
                  )}
                </Box>
              )}

              {/* A/B Testing */}
              {experimentTab === 1 && (
                <Box mt={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Search Query"
                        variant="outlined"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Enter query for A/B test"
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle1">Test Variation</Typography>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={abTestVariation === 'A'} 
                              onChange={(e) => setAbTestVariation(e.target.checked ? 'A' : 'B')} 
                            />
                          }
                          label="Variation A (Default)"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={abTestVariation === 'B'} 
                              onChange={(e) => setAbTestVariation(e.target.checked ? 'B' : 'A')} 
                            />
                          }
                          label="Variation B (Experimental)"
                        />
                      </FormGroup>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle1">Source Selection</Typography>
                      <FormGroup>
                        <FormControlLabel
                          control={<Checkbox checked={sources.ads} onChange={handleSourceChange} name="ads" />}
                          label="ADS/SciX"
                        />
                        <FormControlLabel
                          control={<Checkbox checked={sources.scholar} onChange={handleSourceChange} name="scholar" />}
                          label="Google Scholar"
                        />
                        <FormControlLabel
                          control={<Checkbox checked={sources.semanticScholar} onChange={handleSourceChange} name="semanticScholar" />}
                          label="Semantic Scholar"
                        />
                      </FormGroup>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleRunAbTest}
                        disabled={loading}
                        fullWidth
                      >
                        {loading ? <CircularProgress size={24} /> : "Run A/B Test"}
                      </Button>
                    </Grid>
                  </Grid>

                  {/* A/B Test Results would be displayed here */}
                  {results && results.type === 'abTest' && (
                    <Box mt={4}>
                      <Typography variant="h5" gutterBottom>
                        A/B Test Results (Variation {results.variation})
                      </Typography>
                      <Paper elevation={2} sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                          {/* Test Information */}
                          <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>Test Information</Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="subtitle2">Test ID</Typography>
                                <Typography variant="body2">{results.test_id}</Typography>
                              </Grid>
                              <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="subtitle2">Query</Typography>
                                <Typography variant="body2">{results.query}</Typography>
                              </Grid>
                              <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="subtitle2">Metrics</Typography>
                                <Box>
                                  {results.metrics?.map((metric) => (
                                    <Chip 
                                      key={metric} 
                                      label={metric === 'jaccard' ? 'Jaccard Similarity' : 'Rank-Biased Overlap'} 
                                      size="small" 
                                      sx={{ mr: 0.5, mb: 0.5 }}
                                    />
                                  ))}
                                </Box>
                              </Grid>
                              <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="subtitle2">Fields</Typography>
                                <Box>
                                  {results.fields?.map((field) => (
                                    <Chip 
                                      key={field} 
                                      label={field} 
                                      size="small" 
                                      sx={{ mr: 0.5, mb: 0.5 }}
                                    />
                                  ))}
                                </Box>
                              </Grid>
                            </Grid>
                          </Grid>
                          
                          {/* Search Results */}
                          <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>Search Results by Source</Typography>
                            <Box sx={{ mb: 2 }}>
                              {results.sources?.map((source) => (
                                <Chip 
                                  key={source} 
                                  label={formatSourceName(source)} 
                                  color={
                                    source === 'ads' ? 'primary' :
                                    source === 'scholar' ? 'error' :
                                    source === 'semanticScholar' ? 'warning' : 'success'
                                  }
                                  sx={{ mr: 1, mb: 1 }}
                                />
                              ))}
                            </Box>
                            
                            <TableContainer component={Paper} variant="outlined">
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Source</TableCell>
                                    <TableCell>Result Count</TableCell>
                                    <TableCell>Top Result</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {Object.keys(results.results || {}).map((source) => (
                                    <TableRow key={source}>
                                      <TableCell>
                                        <Typography variant="body2">
                                          {formatSourceName(source)}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        {results.results[source]?.length || 0}
                                      </TableCell>
                                      <TableCell>
                                        {results.results[source]?.[0]?.title || 'No results'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Grid>

                          {/* Detailed Results (First 5 from each source) */}
                          <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                              Detailed Results
                              <Tooltip title="Showing first 5 results from each source">
                                <IconButton size="small">
                                  <InfoIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Typography>
                            
                            {(() => {
                              // Initialize activeSource if it's null or not in results
                              const resultSources = Object.keys(results.results || {});
                              if (!activeSource || !resultSources.includes(activeSource)) {
                                // Set to first source in results if available
                                if (resultSources.length > 0 && activeSource !== resultSources[0]) {
                                  setTimeout(() => setActiveSource(resultSources[0]), 0);
                                }
                              }
                              
                              return (
                                <>
                                  <Tabs
                                    value={resultSources.indexOf(activeSource) !== -1 
                                      ? resultSources.indexOf(activeSource) 
                                      : 0}
                                    onChange={(e, newValue) => {
                                      setActiveSource(resultSources[newValue]);
                                    }}
                                    variant="scrollable"
                                    scrollButtons="auto"
                                  >
                                    {resultSources.map((source) => (
                                      <Tab 
                                        key={source} 
                                        label={formatSourceName(source)} 
                                        id={`source-tab-${source}`}
                                      />
                                    ))}
                                  </Tabs>
                                  
                                  {resultSources.map((source) => (
                                    <div
                                      key={source}
                                      role="tabpanel"
                                      hidden={activeSource !== source}
                                      id={`source-tabpanel-${source}`}
                                      aria-labelledby={`source-tab-${source}`}
                                    >
                                      {activeSource === source && (
                                        <Box sx={{ pt: 2 }}>
                                          <TableContainer>
                                            <Table size="small">
                                              <TableHead>
                                                <TableRow>
                                                  <TableCell>Rank</TableCell>
                                                  <TableCell>Title</TableCell>
                                                  <TableCell>Authors</TableCell>
                                                  <TableCell>Year</TableCell>
                                                  <TableCell>DOI</TableCell>
                                                  <TableCell>Citations</TableCell>
                                                </TableRow>
                                              </TableHead>
                                              <TableBody>
                                                {(results.results[source] || []).slice(0, 5).map((result, idx) => (
                                                  <TableRow key={idx}>
                                                    <TableCell>{result.rank}</TableCell>
                                                    <TableCell>
                                                      <Tooltip title={result.abstract || 'No abstract available'}>
                                                        <Typography variant="body2">
                                                          {result.title}
                                                        </Typography>
                                                      </Tooltip>
                                                    </TableCell>
                                                    <TableCell>
                                                      {Array.isArray(result.authors) 
                                                        ? result.authors.slice(0, 2).join(', ') + 
                                                          (result.authors.length > 2 ? ', et al.' : '')
                                                        : 'N/A'}
                                                    </TableCell>
                                                    <TableCell>{result.year || 'N/A'}</TableCell>
                                                    <TableCell>
                                                      {result.doi ? (
                                                        <a href={`https://doi.org/${result.doi}`} target="_blank" rel="noopener noreferrer">
                                                          {result.doi.substring(0, 15)}...
                                                        </a>
                                                      ) : 'N/A'}
                                                    </TableCell>
                                                    <TableCell>{result.citation_count ?? 'N/A'}</TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </TableContainer>
                                        </Box>
                                      )}
                                    </div>
                                  ))}
                                </>
                              );
                            })()}
                          </Grid>
                        </Grid>
                      </Paper>
                    </Box>
                  )}
                </Box>
              )}

              {/* Log Analysis */}
              {experimentTab === 2 && (
                <Box mt={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="body1">
                        This feature analyzes search logs to identify patterns, performance metrics, and user behavior.
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const response = await experimentService.getLogAnalysis();
                            if (response.error) {
                              setError(response.message);
                            } else {
                              setResults({
                                type: 'logAnalysis',
                                ...response
                              });
                            }
                          } catch (err) {
                            setError(`Failed to get log analysis: ${err.message}`);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        fullWidth
                      >
                        {loading ? <CircularProgress size={24} /> : "Analyze Logs"}
                      </Button>
                    </Grid>
                  </Grid>

                  {/* Log Analysis Results would be displayed here */}
                  {results && results.type === 'logAnalysis' && (
                    <Box mt={4}>
                      <Typography variant="h5" gutterBottom>
                        Log Analysis Results
                      </Typography>
                      <Paper elevation={2} sx={{ p: 2 }}>
                        <Grid container spacing={3}>
                          {/* Summary Statistics */}
                          <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>Summary Statistics</Typography>
                            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Metric</TableCell>
                                    <TableCell>Value</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  <TableRow>
                                    <TableCell>Total Queries</TableCell>
                                    <TableCell>{results.summary?.total_queries || 0}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell>Unique Users</TableCell>
                                    <TableCell>{results.summary?.unique_users || 0}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell>Average Results</TableCell>
                                    <TableCell>{results.summary?.avg_results?.toFixed(2) || 0}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell>Time Period</TableCell>
                                    <TableCell>
                                      {results.summary?.start_date && results.summary?.end_date
                                        ? `${new Date(results.summary.start_date).toLocaleDateString()} to ${new Date(results.summary.end_date).toLocaleDateString()}`
                                        : 'N/A'}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Grid>
                          
                          {/* Popular Queries */}
                          {results.popular_queries && results.popular_queries.length > 0 && (
                            <Grid item xs={12} md={6}>
                              <Typography variant="h6" gutterBottom>Popular Queries</Typography>
                              <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Query</TableCell>
                                      <TableCell align="right">Count</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {results.popular_queries.map((item, index) => (
                                      <TableRow key={index}>
                                        <TableCell>{item.query}</TableCell>
                                        <TableCell align="right">{item.count}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Grid>
                          )}
                          
                          {/* Source Performance */}
                          {results.source_performance && Object.keys(results.source_performance).length > 0 && (
                            <Grid item xs={12} md={6}>
                              <Typography variant="h6" gutterBottom>Source Performance</Typography>
                              <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Source</TableCell>
                                      <TableCell align="right">Avg. Results</TableCell>
                                      <TableCell align="right">Avg. Response Time (ms)</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {Object.entries(results.source_performance).map(([source, data]) => (
                                      <TableRow key={source}>
                                        <TableCell>{formatSourceName(source)}</TableCell>
                                        <TableCell align="right">{data.avg_results?.toFixed(2) || 0}</TableCell>
                                        <TableCell align="right">{data.avg_response_time?.toFixed(0) || 0}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Grid>
                          )}
                          
                          {/* Error Distribution */}
                          {results.errors && results.errors.length > 0 && (
                            <Grid item xs={12}>
                              <Typography variant="h6" gutterBottom>Error Distribution</Typography>
                              <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Error Type</TableCell>
                                      <TableCell>Source</TableCell>
                                      <TableCell align="right">Count</TableCell>
                                      <TableCell>Sample Message</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {results.errors.map((error, index) => (
                                      <TableRow key={index}>
                                        <TableCell>{error.type}</TableCell>
                                        <TableCell>{error.source ? formatSourceName(error.source) : 'N/A'}</TableCell>
                                        <TableCell align="right">{error.count}</TableCell>
                                        <TableCell>
                                          <Tooltip title={error.message || 'No details available'}>
                                            <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                                              {error.message || 'N/A'}
                                            </Typography>
                                          </Tooltip>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Grid>
                          )}
                          
                          {/* If no structured data is available, show raw JSON as fallback */}
                          {(!results.summary && !results.popular_queries && !results.source_performance && !results.errors) && (
                            <Grid item xs={12}>
                              <Typography variant="subtitle1" color="text.secondary" align="center" gutterBottom>
                                No structured analysis data available. Showing raw data:
                              </Typography>
                              <Paper sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                                <pre>{JSON.stringify(results, null, 2)}</pre>
                              </Paper>
                            </Grid>
                          )}
                        </Grid>
                      </Paper>
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          </Box>
        )}

        {/* Debug Tab */}
        {mainTab === 2 && (
          <Box my={4}>
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Tabs
                value={debugTab}
                onChange={handleDebugTabChange}
                variant="fullWidth"
                textColor="primary"
                indicatorColor="primary"
              >
                <Tab label="Environment" id="debug-tab-0" />
                <Tab label="Sources" id="debug-tab-1" />
                <Tab label="Test Search" id="debug-tab-2" />
              </Tabs>

              {/* Environment Info */}
              {debugTab === 0 && (
                <Box mt={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const response = await debugService.getEnvironmentInfo();
                        if (response.error) {
                          setError(response.message);
                        } else {
                          setEnvironmentInfo(response);
                        }
                      } catch (err) {
                        setError(`Failed to get environment info: ${err.message}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    sx={{ mb: 2 }}
                  >
                    {loading ? <CircularProgress size={24} /> : "Refresh Environment Info"}
                  </Button>

                  {environmentInfo && (
                    <Paper elevation={2} sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        Environment Information
                      </Typography>
                      <Grid container spacing={2}>
                        {/* System Info */}
                        <Grid item xs={12} md={6}>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>System</Typography>
                            <TableContainer>
                              <Table size="small">
                                <TableBody>
                                  <TableRow>
                                    <TableCell><strong>Python Version</strong></TableCell>
                                    <TableCell>{environmentInfo.python_version || 'N/A'}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell><strong>OS Platform</strong></TableCell>
                                    <TableCell>{environmentInfo.platform || 'N/A'}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell><strong>Environment</strong></TableCell>
                                    <TableCell>{environmentInfo.environment || 'development'}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell><strong>Debug Mode</strong></TableCell>
                                    <TableCell>
                                      <Chip 
                                        label={environmentInfo.debug ? 'Enabled' : 'Disabled'} 
                                        color={environmentInfo.debug ? 'warning' : 'default'}
                                        size="small"
                                      />
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Paper>
                        </Grid>
                        
                        {/* API Keys */}
                        <Grid item xs={12} md={6}>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>API Configuration</Typography>
                            <TableContainer>
                              <Table size="small">
                                <TableBody>
                                  {Object.entries(environmentInfo.api_keys || {}).map(([key, value]) => (
                                    <TableRow key={key}>
                                      <TableCell><strong>{key}</strong></TableCell>
                                      <TableCell>
                                        <Chip 
                                          label={value ? 'Configured' : 'Missing'} 
                                          color={value ? 'success' : 'error'}
                                          size="small"
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Paper>
                        </Grid>
                        
                        {/* Dependencies */}
                        {environmentInfo.dependencies && Object.keys(environmentInfo.dependencies).length > 0 && (
                          <Grid item xs={12}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                              <Typography variant="subtitle1" gutterBottom>Dependencies</Typography>
                              <TableContainer sx={{ maxHeight: 300 }}>
                                <Table size="small" stickyHeader>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Package</TableCell>
                                      <TableCell>Version</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {Object.entries(environmentInfo.dependencies).map(([pkg, version]) => (
                                      <TableRow key={pkg}>
                                        <TableCell>{pkg}</TableCell>
                                        <TableCell>{version}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Paper>
                          </Grid>
                        )}
                        
                        {/* Raw Data (Collapsed) */}
                        <Grid item xs={12}>
                          <Accordion>
                            <AccordionSummary expandIcon={<InfoIcon />}>
                              <Typography>View Raw Environment Data</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <pre style={{ maxHeight: '300px', overflow: 'auto' }}>
                                {JSON.stringify(environmentInfo, null, 2)}
                              </pre>
                            </AccordionDetails>
                          </Accordion>
                        </Grid>
                      </Grid>
                    </Paper>
                  )}
                </Box>
              )}

              {/* Sources Info */}
              {debugTab === 1 && (
                <Box mt={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleListSources}
                    disabled={loading}
                    sx={{ mb: 2, mr: 2 }}
                  >
                    {loading ? <CircularProgress size={24} /> : "List Sources"}
                  </Button>

                  {/* Source Info */}
                  {sourcesList && (
                    <Grid item xs={12}>
                      <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          Available Search Sources
                        </Typography>
                        <List>
                          {sourcesList.map(source => (
                            <ListItem key={source.id}>
                              <ListItemAvatar>
                                <Avatar sx={{ 
                                  bgcolor: 
                                    source.id === 'ads' ? 'primary.main' :
                                    source.id === 'scholar' ? 'error.main' :
                                    source.id === 'semanticScholar' ? 'warning.main' : 'success.main' 
                                }}>
                                  <SearchIcon />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText 
                                primary={formatSourceName(source.id)} 
                                secondary={`Status: ${source.status}, Max Results: ${source.max_results}`} 
                              />
                              <ListItemSecondaryAction>
                                <Button 
                                  size="small" 
                                  onClick={() => handlePingSource(source.id)}
                                  startIcon={<NetworkCheckIcon />}
                                >
                                  Ping
                                </Button>
                                <Button 
                                  size="small" 
                                  onClick={() => handleTestSearch(source.id)}
                                  disabled={!query.trim()}
                                  startIcon={<CheckIcon />}
                                  sx={{ ml: 1 }}
                                >
                                  Test Search
                                </Button>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Grid>
                  )}

                  {/* Ping Results */}
                  {Object.keys(pingResults).length > 0 && (
                    <Grid item xs={12}>
                      <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          Ping Results
                        </Typography>
                        <List>
                          {Object.entries(pingResults).map(([sourceId, result]) => (
                            <ListItem key={sourceId}>
                              <ListItemAvatar>
                                <Avatar sx={{ 
                                  bgcolor: 
                                    sourceId === 'ads' ? 'primary.main' :
                                    sourceId === 'scholar' ? 'error.main' :
                                    sourceId === 'semanticScholar' ? 'warning.main' : 'success.main' 
                                }}>
                                  <SearchIcon />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText 
                                primary={formatSourceName(sourceId)} 
                                secondary={
                                  result.loading ? 'Pinging...' :
                                  result.error ? `Error: ${result.error}` :
                                  `Response time: ${result.response_time_ms}ms, Status: ${result.status}`
                                } 
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Grid>
                  )}
                </Box>
              )}

              {/* Test Search */}
              {debugTab === 2 && (
                <Box mt={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Test Search Query"
                        variant="outlined"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Enter query for testing"
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle1">Select Source to Test</Typography>
                      <Box display="flex" flexWrap="wrap" gap={2} mt={1}>
                        <Button
                          variant="outlined"
                          onClick={() => handleTestSearch('ads')}
                          disabled={loading}
                        >
                          Test ADS/SciX
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => handleTestSearch('scholar')}
                          disabled={loading}
                        >
                          Test Google Scholar
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => handleTestSearch('semanticScholar')}
                          disabled={loading}
                        >
                          Test Semantic Scholar
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => handleTestSearch('webOfScience')}
                          disabled={loading}
                        >
                          Test Web of Science
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Test Search Results */}
                  {testSearchResults && (
                    <Box mt={4}>
                      <Typography variant="h5" gutterBottom>
                        Test Search Results for {testSearchResults.source}
                      </Typography>
                      <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="subtitle1">
                          Query: {testSearchResults.query} | 
                          Results: {testSearchResults.count} | 
                          Time: {testSearchResults.response_time_ms}ms
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <pre>{JSON.stringify(testSearchResults.results, null, 2)}</pre>
                      </Paper>
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          </Box>
        )}

        {/* About Tab */}
        {mainTab === 3 && (
          <Box my={4}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                About Search Comparisons
              </Typography>
              <Typography variant="body1" paragraph>
                This application allows you to compare search results across multiple academic search engines,
                including ADS/SciX, Google Scholar, Semantic Scholar, and Web of Science.
              </Typography>
              <Typography variant="body1" paragraph>
                Features include:
              </Typography>
              <ul>
                <li>Compare results across multiple sources</li>
                <li>Analyze similarity between result sets</li>
                <li>Experiment with boosting factors to improve rankings</li>
                <li>Perform A/B testing of different search algorithms</li>
                <li>Debug tools for API testing and diagnostics</li>
              </ul>
              <Typography variant="body1" paragraph>
                Version: {APP_VERSION}
              </Typography>
              <Typography variant="body1">
                Backend API: {API_URL}
              </Typography>
              {environmentInfo && environmentInfo.environment && (
                <Typography variant="body1">
                  Environment: {environmentInfo.environment}
                </Typography>
              )}
            </Paper>
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default App; 